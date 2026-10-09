import { createContext, useContext, useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { AppState } from 'react-native';

import { floatingAssistantNative as native, type AssistantModelStatus } from '@/infrastructure/floating-assistant/native';
import { useTranslation } from '@/shared/i18n';
import { useModel } from '@/shared/providers/model-provider';
import { AssistantConversation } from '@/shared/services/floating-assistant/conversation';
import { AssistantSession } from '@/shared/services/floating-assistant/session';
import { useFloatingAssistantStore } from '@/shared/stores/floating-assistant-store';

interface FloatingAssistantValue {
  /** False on web, on iOS, and in a build made before the native module existed. */
  available: boolean;
  enabled: boolean;
  running: boolean;
  permissionGranted: boolean;
  notificationsEnabled: boolean;
  hasScreenContext: boolean;
  /** Re-reads "display over other apps" from Android, for example after returning from system settings. */
  refreshPermission(): boolean;
  openPermissionSettings(): void;
  /** Turns the assistant on. Returns false, and changes nothing, while the overlay permission is missing. */
  enable(): boolean;
  disable(): void;
  resetBubblePosition(): void;
  clearScreenContext(): void;
}

const FloatingAssistantContext = createContext<FloatingAssistantValue | null>(null);

/** Keys the overlay expects, mapped to this app's translations. */
const OVERLAY_STRINGS = {
  title: 'floating.overlayTitle', bubbleLabel: 'floating.bubbleLabel', greeting: 'floating.greeting',
  placeholder: 'floating.placeholder', send: 'floating.send', stop: 'floating.stop', minimize: 'floating.minimize',
  close: 'floating.close', actionAsk: 'floating.actionAsk', actionAnalyze: 'floating.actionAnalyze',
  actionExplain: 'floating.actionExplain', actionSummarize: 'floating.actionSummarize',
  statusReady: 'floating.statusReady', statusLoading: 'floating.statusLoading', statusBusy: 'floating.statusBusy',
  statusNotLoaded: 'floating.statusNotLoaded', statusMissing: 'floating.statusMissing',
  statusUnavailable: 'floating.statusUnavailable', appClosed: 'floating.appClosed', openApp: 'floating.openApp',
  captureTitle: 'floating.captureTitle', captureBody: 'floating.captureBody', captureContinue: 'floating.captureContinue',
  captureCancel: 'floating.captureCancel', screenAttached: 'floating.screenAttached', discard: 'floating.discard',
  menuOpen: 'floating.menuOpen', menuMoveLeft: 'floating.menuMoveLeft', menuMoveRight: 'floating.menuMoveRight',
  menuClose: 'floating.menuClose', notificationChannel: 'floating.notificationChannel',
  notificationTitle: 'floating.notificationTitle', notificationText: 'floating.notificationText',
  notificationStop: 'floating.notificationStop', captureNotificationTitle: 'floating.captureNotificationTitle',
  captureNotificationText: 'floating.captureNotificationText',
} as const;

/**
 * Runs the floating assistant's conversation. The overlay is drawn by native code; every answer
 * comes from the one model the app already owns, through ModelProvider.
 */
export function FloatingAssistantProvider({ children }: PropsWithChildren) {
  const model = useModel();
  const { t, locale } = useTranslation();
  const enabled = useFloatingAssistantStore((state) => state.enabled);
  const hasHydrated = useFloatingAssistantStore((state) => state.hasHydrated);
  const [running, setRunning] = useState(() => native?.isRunning() ?? false);
  const [permissionGranted, setPermissionGranted] = useState(() => native?.canDrawOverlays() ?? false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => native?.notificationsEnabled() ?? true);
  const [hasScreenContext, setHasScreenContext] = useState(false);

  // Event handlers outlive renders, so they read the current model and translations from here.
  const live = useRef({ model, t });
  const active = useRef<AssistantConversation | null>(null);

  useEffect(() => { live.current = { model, t }; });

  useEffect(() => {
    void Promise.resolve(useFloatingAssistantStore.persist.rehydrate())
      .finally(() => useFloatingAssistantStore.getState().setHasHydrated(true));
  }, []);

  // Keep the overlay service in step with the saved setting.
  useEffect(() => {
    if (!native || !hasHydrated) return;
    if (!enabled) {
      if (native.isRunning()) native.stop();
      return;
    }
    const strings: Record<string, string> = {};
    for (const [key, message] of Object.entries(OVERLAY_STRINGS)) strings[key] = live.current.t(message);
    // Without the permission nothing may be drawn, so the setting falls back to off.
    if (!native.start(strings)) useFloatingAssistantStore.getState().setEnabled(false);
  }, [enabled, hasHydrated, locale]);

  // The assistant is used while another app is in front, so the model must survive backgrounding.
  useEffect(() => { model.setBackgroundHold(enabled && running); });

  const status: AssistantModelStatus = !model.installed ? 'missing'
    : model.operation === 'verifying' || model.operation === 'loading' ? 'loading'
    : model.state.status === 'generating' || model.operation === 'answering' ? 'busy'
    : model.state.status === 'ready' ? 'ready' : 'notLoaded';
  useEffect(() => { if (running) native?.setModelStatus(status); }, [running, status]);

  useEffect(() => {
    if (!native) return;
    const overlay = native;
    const conversation = new AssistantConversation({
      overlay,
      session: new AssistantSession(),
      model: () => live.current.model,
      say: (message, vars) => live.current.t(`floating.${message}`, vars),
      onScreenContext: setHasScreenContext,
    });
    active.current = conversation;
    // A new conversation holds no screen text, so an overlay left over from a reload must not claim it does.
    overlay.setScreenAttached(false, null);

    const subscriptions = [
      overlay.addListener('onUserMessage', (event) => { void conversation.answer(event.id, event.text); }),
      overlay.addListener('onScreenCaptured', (event) => conversation.captured(event)),
      overlay.addListener('onCancelRequested', () => conversation.cancel()),
      overlay.addListener('onClearContext', () => conversation.discardScreen({ notify: true })),
      overlay.addListener('onOverlayState', (event) => {
        setRunning(event.running);
        if (event.running) return;
        // The conversation and any captured text end with the overlay.
        conversation.end();
        // Closed by the user, or the permission was taken away: stay off until turned on again.
        if (event.reason !== 'system') useFloatingAssistantStore.getState().setEnabled(false);
      }),
      overlay.addListener('onMemoryPressure', () => {
        const current = live.current.model;
        if (conversation.isAnswering || current.state.status !== 'ready') return;
        void current.unloadModel().then(() => overlay.showNotice(live.current.t('floating.memoryUnloaded')));
      }),
    ];
    return () => {
      subscriptions.forEach((subscription) => subscription.remove());
      conversation.end();
      active.current = null;
    };
  }, []);

  // Returning from system settings is the moment the permission may have changed.
  useEffect(() => {
    if (!native) return;
    const overlay = native;
    const subscription = AppState.addEventListener('change', (next) => {
      if (next !== 'active') return;
      const granted = overlay.canDrawOverlays();
      setPermissionGranted(granted);
      setNotificationsEnabled(overlay.notificationsEnabled());
      if (!granted && useFloatingAssistantStore.getState().enabled) useFloatingAssistantStore.getState().setEnabled(false);
    });
    return () => subscription.remove();
  }, []);

  const value: FloatingAssistantValue = {
    available: native !== null,
    enabled, running, permissionGranted, notificationsEnabled, hasScreenContext,
    refreshPermission() {
      const granted = native?.canDrawOverlays() ?? false;
      setPermissionGranted(granted);
      return granted;
    },
    openPermissionSettings() { native?.openOverlaySettings(); },
    enable() {
      if (!native?.canDrawOverlays()) {
        setPermissionGranted(false);
        return false;
      }
      setPermissionGranted(true);
      useFloatingAssistantStore.getState().setEnabled(true);
      return true;
    },
    disable() { useFloatingAssistantStore.getState().setEnabled(false); },
    resetBubblePosition() { native?.resetBubblePosition(); },
    clearScreenContext() { active.current?.discardScreen({ notify: false }); },
  };

  return <FloatingAssistantContext.Provider value={value}>{children}</FloatingAssistantContext.Provider>;
}

export function useFloatingAssistant() {
  const assistant = useContext(FloatingAssistantContext);
  if (!assistant) throw new Error('useFloatingAssistant must be used within FloatingAssistantProvider.');
  return assistant;
}
