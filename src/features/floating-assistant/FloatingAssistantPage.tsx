import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useEffect, useState } from "react";
import { AppState, PermissionsAndroid, Platform, StyleSheet, View } from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { Page } from "@/shared/components/page";
import { PillButton } from "@/shared/components/pill-button";
import { StatusCard } from "@/shared/components/status-card";
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

const SUCCESS_POINTS: MessageKey[] = [
  "floating.successBubble", "floating.successDrag", "floating.successModel", "floating.successScreen",
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
  const [justEnabled, setJustEnabled] = useState(false);

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
          setJustEnabled(true);
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
        setJustEnabled(true);
        void askForNotifications();
      } else {
        setDenied(true);
      }
    });
  }

  if (!assistant.available) {
    return (
      <Page nested title={t("stack.floatingAssistant")}>
        <StatusCard title={t("floating.unavailableTitle")} description={t("floating.unavailableBody")} />
      </Page>
    );
  }

  if (justEnabled && assistant.enabled) {
    return (
      <Page nested title={t("floating.successTitle")} description={t("floating.successBody")}>
        <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
          <SymbolView name={{ ios: "checkmark", android: "check", web: "check" }} size={44} tintColor={colors.tint} />
        </View>
        <View style={styles.points}>
          {SUCCESS_POINTS.map((point) => (
            <View key={point} style={styles.point}>
              <SymbolView name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }} size={20} tintColor={colors.tint} />
              <ThemedText style={styles.pointText}>{t(point)}</ThemedText>
            </View>
          ))}
        </View>
        <PillButton label={t("floating.getStarted")} onPress={() => setJustEnabled(false)} />
      </Page>
    );
  }

  if (!assistant.enabled) {
    return (
      <Page nested title={t("floating.introTitle")} description={t("floating.introBody")}>
        <View style={[styles.badge, { backgroundColor: colors.backgroundSelected }]}>
          <Image source={require("@/assets/logo/logo-greenbg.png")} style={styles.logo} contentFit="cover" accessibilityLabel="" />
        </View>
        <View style={styles.points}>
          {INTRO_POINTS.map((point) => (
            <View key={point.text} style={styles.point}>
              <SymbolView name={point.icon} size={20} tintColor={colors.tint} />
              <ThemedText style={styles.pointText}>{t(point.text)}</ThemedText>
            </View>
          ))}
        </View>
        {!assistant.permissionGranted && (
          <ThemedText type="small" themeColor="textSecondary">{t("floating.permissionNote")}</ThemedText>
        )}
        {denied && <ThemedText themeColor="error" accessibilityRole="alert">{t("floating.permissionDenied")}</ThemedText>}
        <PillButton label={t("floating.enable")} onPress={start} />
        <PillButton label={t("floating.notNow")} variant="outline" onPress={() => router.back()} />
        <StatusCard title={t("floating.screenTitle")} description={t("floating.screenBody")} />
      </Page>
    );
  }

  return (
    <Page nested title={t("stack.floatingAssistant")} description={t("floating.statusOn")}>
      <StatusCard
        title={t("floating.permissionTitle")}
        description={assistant.permissionGranted ? t("floating.permissionGranted") : t("floating.permissionMissing")}
      >
        <ActionButton label={t("floating.openPermission")} onPress={assistant.openPermissionSettings} />
      </StatusCard>
      {!assistant.notificationsEnabled && (
        <ThemedText type="small" themeColor="textSecondary">{t("floating.notificationsOff")}</ThemedText>
      )}
      <StatusCard title={t("floating.screenTitle")} description={t("floating.screenBody")}>
        <ThemedText type="small" themeColor="textSecondary">
          {assistant.hasScreenContext ? t("floating.contextKept") : t("floating.contextNone")}
        </ThemedText>
        <ActionButton label={t("floating.clearContext")} disabled={!assistant.hasScreenContext} onPress={assistant.clearScreenContext} />
      </StatusCard>
      <StatusCard variant="ai" title={t("floating.modelTitle")} description={t("floating.modelBody")} />
      <ActionButton label={t("floating.resetBubble")} onPress={assistant.resetBubblePosition} />
      <ActionButton label={t("floating.turnOff")} destructive onPress={assistant.disable} />
    </Page>
  );
}

const styles = StyleSheet.create({
  badge: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignSelf: "center",
    alignItems: "center",
    justifyContent: "center",
  },
  logo: { width: 72, height: 72, borderRadius: 18 },
  points: { gap: Spacing.two },
  point: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  pointText: { flex: 1 },
});
