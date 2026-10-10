import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionRow } from "@/shared/components/action-row";
import { LeafDecor } from "@/shared/components/leaf-decor";
import { RowGroup } from "@/shared/components/row-group";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import {
  formatMegabytes,
  installedSizeMb,
} from "@/shared/constants/sample-library";
import { usePackDownloadStore } from "@/shared/stores/pack-download-store";
import { contentSources } from "@/shared/constants/content-sources";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useModel } from "@/shared/providers/model-provider";
import { useFloatingAssistantStore } from "@/shared/stores/floating-assistant-store";
import {
  APP_LOCALES,
  LOCALE_NAMES,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";
import { useThemeStore, type ThemeMode } from "@/shared/stores/theme-store";
import { OptionSheet, ProfileCard } from "./components";

const APPEARANCE_IDS = ["system", "light", "dark"] as const satisfies readonly ThemeMode[];

const LANGUAGE_OPTIONS = APP_LOCALES.map((language) => ({
  id: language,
  label: LOCALE_NAMES[language],
}));

export default function SettingsPage() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [sheet, setSheet] = useState<"appearance" | "language" | null>(null);
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useOnboardingStore((state) => state.language);
  const setLanguage = useOnboardingStore((state) => state.setLanguage);
  const resetTour = useOnboardingStore((state) => state.resetTour);
  const { installed, state } = useModel();
  const installedPacks = usePackDownloadStore((store) => store.installed);
  const readings = useOfflineReadingStore((store) => store.items);
  const hydrateReading = useOfflineReadingStore((store) => store.hydrate);
  useEffect(() => { void hydrateReading(); }, [hydrateReading]);
  const readingBytes = readings.reduce((total, item) => total + item.sizeBytes, 0);
  const floatingEnabled = useFloatingAssistantStore((store) => store.enabled);

  const appearanceOptions = [
    { id: APPEARANCE_IDS[0], label: t("settings.matchDevice") },
    { id: APPEARANCE_IDS[1], label: t("settings.lightMode") },
    { id: APPEARANCE_IDS[2], label: t("settings.darkMode") },
  ];
  const appearanceLabel =
    appearanceOptions.find((option) => option.id === themeMode)?.label ??
    t("settings.matchDevice");
  const modelLabel = !installed
    ? t("settings.notInstalled")
    : state.status === "ready" || state.status === "generating"
      ? t("settings.ready")
      : t("settings.installed");

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      <LeafDecor width={130} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          {t("settings.title")}
        </ThemedText>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        <ProfileCard
          name="Explorer"
          detail={t("settings.profileDetail")}
        />

        <RowGroup>
          <ActionRow
            first
            icon={{ ios: "sun.max", android: "light_mode", web: "light_mode" }}
            label={t("settings.appearance")}
            value={appearanceLabel}
            onPress={() => setSheet("appearance")}
          />
          <ActionRow
            icon={{ ios: "globe", android: "language", web: "language" }}
            label={t("settings.language")}
            value={LOCALE_NAMES[language]}
            onPress={() => setSheet("language")}
          />
          <ActionRow
            icon={{
              ios: "cpu",
              android: "memory",
              web: "memory",
            }}
            label={t("settings.aiModel")}
            value={modelLabel}
            onPress={() => router.navigate("/model")}
          />
          <ActionRow
            icon={{ ios: "bubble.left", android: "chat_bubble", web: "chat_bubble" }}
            label={t("settings.floatingAssistant")}
            value={floatingEnabled ? t("settings.on") : t("settings.off")}
            onPress={() => router.navigate("/floating-assistant")}
          />
          <ActionRow
            icon={{
              ios: "internaldrive",
              android: "storage",
              web: "storage",
            }}
            label={t("settings.manageStorage")}
            value={t("settings.storageUsed", {
              size: contentSources.openStax
                ? formatMegabytes(installedSizeMb(installedPacks))
                : `${Math.ceil(readingBytes / 1024)} KB`,
            })}
            onPress={() => contentSources.openStax
              ? router.navigate("/packs")
              : router.navigate({ pathname: "/(tabs)/library", params: { shelf: "reading" } })}
          />
          <ActionRow
            icon={{
              ios: "bell",
              android: "notifications_none",
              web: "notifications_none",
            }}
            label={t("settings.notifications")}
          />
          <ActionRow
            icon={{
              ios: "lock.shield",
              android: "shield",
              web: "shield",
            }}
            label={t("settings.privacy")}
            onPress={() => router.navigate("/setup")}
          />
          <ActionRow
            icon={{
              ios: "questionmark.circle",
              android: "help_outline",
              web: "help_outline",
            }}
            label={t("settings.help")}
            onPress={() => router.navigate("/help")}
          />
        </RowGroup>

        <RowGroup>
          <ActionRow
            first
            icon={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
            label={t("settings.replayTour")}
            onPress={resetTour}
          />
        </RowGroup>

        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("settings.replayNote")}
        </ThemedText>
      </ScrollView>

      <OptionSheet
        title={t("settings.appearance")}
        visible={sheet === "appearance"}
        options={appearanceOptions}
        value={themeMode}
        onSelect={setThemeMode}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        title={t("settings.language")}
        visible={sheet === "language"}
        options={LANGUAGE_OPTIONS}
        value={language}
        onSelect={setLanguage}
        onClose={() => setSheet(null)}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
  },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: Spacing.one },
});
