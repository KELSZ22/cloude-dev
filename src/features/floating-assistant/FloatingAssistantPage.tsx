import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useState } from "react";
import { AppState, PermissionsAndroid, Platform, StyleSheet, View } from "react-native";

import { ActionRow } from "@/shared/components/action-row";
import { InfoRow } from "@/shared/components/info-row";
import { PillButton } from "@/shared/components/pill-button";
import { RowGroup } from "@/shared/components/row-group";
import { StackPage } from "@/shared/components/stack-page";
import { StateFigure } from "@/shared/components/state-figure";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useFloatingAssistant } from "@/shared/providers/floating-assistant-provider";

const INTRO_POINTS: { icon: SymbolViewProps["name"]; text: MessageKey }[] = [
  { icon: { ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }, text: "floating.featureBubble" },
  { icon: { ios: "questionmark.circle", android: "help_outline", web: "help_outline" }, text: "floating.featureAsk" },
  { icon: { ios: "mic", android: "mic", web: "mic" }, text: "floating.featureVoice" },
  { icon: { ios: "viewfinder", android: "crop_free", web: "crop_free" }, text: "floating.featureAnalyze" },
  { icon: { ios: "wifi.slash", android: "wifi_off", web: "wifi_off" }, text: "floating.featureOffline" },
];

/** Android 13 and later only show the assistant's status notification if the user allows notifications. */
async function askForNotifications() {
  if (Platform.OS !== "android" || Number(Platform.Version) < 33) return;
  try {
    await PermissionsAndroid.request("android.permission.POST_NOTIFICATIONS");
  } catch {
    // The bubble works without the notification, so a failed request is not an error.
  }
}

/**
 * Asked before the overlay starts, because Android decides then whether that service may use the
 * microphone at all. Voice input is optional; the bubble works either way.
 */
async function askForMicrophone() {
  if (Platform.OS !== "android") return;
  try {
    await PermissionsAndroid.request("android.permission.RECORD_AUDIO");
  } catch {
    // Declined or unavailable: the user can still type.
  }
}

export default function FloatingAssistantPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const assistant = useFloatingAssistant();
  // Set while the user is away in Android's permission screen, so their return can be checked.
  const [awaitingPermission, setAwaitingPermission] = useState(false);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    if (!awaitingPermission) return;
    const subscription = AppState.addEventListener("change", (next) => {
      if (next !== "active") return;
      setAwaitingPermission(false);
      if (!assistant.refreshPermission()) {
        setDenied(true);
        return;
      }
      void askForMicrophone().then(() => {
        if (assistant.enable()) {
          setDenied(false);
          void askForNotifications();
        } else {
          setDenied(true);
        }
      });
    });
    return () => subscription.remove();
  }, [assistant, awaitingPermission]);

  function start() {
    setDenied(false);
    if (!assistant.refreshPermission()) {
      setAwaitingPermission(true);
      assistant.openPermissionSettings();
      return;
    }
    void askForMicrophone().then(() => {
      if (assistant.enable()) {
        void askForNotifications();
      } else {
        setDenied(true);
      }
    });
  }

  if (!assistant.available) {
    return (
      <StackPage title={t("stack.floatingAssistant")}>
        <StateFigure
          label={t("floating.stateUnavailable")}
          value={t("floating.off")}
          caption={t("floating.unavailableBody")}
          tone="cost"
          progress={null}
        />
      </StackPage>
    );
  }

  const on = assistant.enabled;

  return (
    <StackPage title={t("stack.floatingAssistant")}>
      <StateFigure
        // Only the running state needs a label; "Off" above "Off" would say it twice.
        label={on ? t("floating.stateOn") : undefined}
        value={on ? t("floating.on") : t("floating.off")}
        caption={on ? t("floating.statusOn") : t("floating.introBody")}
        tone={on ? "done" : "cost"}
        progress={null}
      />

      {denied ? (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {t("floating.permissionDenied")}
        </ThemedText>
      ) : null}

      {on ? (
        <RowGroup>
          <InfoRow
            first
            icon={{ ios: "rectangle.on.rectangle", android: "layers", web: "layers" }}
            label={t("floating.permissionTitle")}
            value={
              assistant.permissionGranted
                ? t("floating.permissionGranted")
                : t("floating.permissionMissing")
            }
          />
          <InfoRow
            icon={{ ios: "bell", android: "notifications_none", web: "notifications_none" }}
            label={t("floating.rowNotifications")}
            value={assistant.notificationsEnabled ? t("settings.on") : t("settings.off")}
          />
          <InfoRow
            icon={{ ios: "viewfinder", android: "crop_free", web: "crop_free" }}
            label={t("floating.rowScreenText")}
            value={
              assistant.hasScreenContext ? t("floating.rowScreenKept") : t("floating.rowScreenNone")
            }
          />
        </RowGroup>
      ) : (
        <View style={[styles.points, { borderColor: colors.border }]}>
          {INTRO_POINTS.map((point) => (
            <View key={point.text} style={styles.point}>
              <SymbolView name={point.icon} size={20} tintColor={colors.tint} />
              <ThemedText type="small" style={styles.pointText}>
                {t(point.text)}
              </ThemedText>
            </View>
          ))}
        </View>
      )}

      {on ? (
        <RowGroup>
          <ActionRow
            first
            icon={{ ios: "lock.shield", android: "shield", web: "shield" }}
            label={t("floating.openPermission")}
            onPress={assistant.openPermissionSettings}
          />
          <ActionRow
            icon={{ ios: "arrow.counterclockwise", android: "refresh", web: "refresh" }}
            label={t("floating.resetBubble")}
            onPress={assistant.resetBubblePosition}
          />
          <ActionRow
            icon={{ ios: "eraser", android: "delete_sweep", web: "delete_sweep" }}
            label={t("floating.clearContext")}
            onPress={assistant.clearScreenContext}
            disabled={!assistant.hasScreenContext}
          />
          <ActionRow
            icon={{ ios: "xmark.circle", android: "cancel", web: "cancel" }}
            label={t("floating.turnOff")}
            destructive
            onPress={assistant.disable}
          />
        </RowGroup>
      ) : (
        <>
          <PillButton label={t("floating.enable")} onPress={start} />
          <PillButton label={t("floating.notNow")} variant="outline" onPress={() => router.back()} />
        </>
      )}

      {!assistant.permissionGranted && !on ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("floating.permissionNote")}
        </ThemedText>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        {t("floating.screenBody")}
      </ThemedText>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  points: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  point: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  pointText: { flex: 1 },
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: Spacing.one },
});
