import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import {
  formatMegabytes,
  installedSizeMb,
} from "@/shared/constants/sample-library";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useModel } from "@/shared/providers/model-provider";
import {
  ONBOARDING_LANGUAGES,
  useOnboardingStore,
  type OnboardingLanguage,
} from "@/shared/stores/onboarding-store";
import { useThemeStore, type ThemeMode } from "@/shared/stores/theme-store";
import {
  OptionSheet,
  ProfileCard,
  SettingsGroup,
  SettingsRow,
} from "./components";

const APPEARANCE_OPTIONS: readonly { id: ThemeMode; label: string }[] = [
  { id: "system", label: "Match device" },
  { id: "light", label: "Light mode" },
  { id: "dark", label: "Dark mode" },
];

const LANGUAGE_OPTIONS = ONBOARDING_LANGUAGES.map((language) => ({
  id: language,
  label: language,
}));

export default function SettingsPage() {
  const insets = useSafeAreaInsets();
  const [sheet, setSheet] = useState<"appearance" | "language" | null>(null);
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useOnboardingStore((state) => state.language);
  const setLanguage = useOnboardingStore((state) => state.setLanguage);
  const resetTour = useOnboardingStore((state) => state.resetTour);
  const { installed, state } = useModel();

  const appearanceLabel =
    APPEARANCE_OPTIONS.find((option) => option.id === themeMode)?.label ??
    "Match device";
  const modelLabel = !installed
    ? "Not installed"
    : state.status === "ready" || state.status === "generating"
      ? "Ready"
      : "Installed";

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <LeafDecor width={130} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          Settings
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
          detail="Local profile · nothing leaves this device"
        />

        <SettingsGroup>
          <SettingsRow
            first
            icon={{ ios: "sun.max", android: "light_mode", web: "light_mode" }}
            label="Appearance"
            value={appearanceLabel}
            onPress={() => setSheet("appearance")}
          />
          <SettingsRow
            icon={{ ios: "globe", android: "language", web: "language" }}
            label="Language"
            value={language}
            onPress={() => setSheet("language")}
          />
          <SettingsRow
            icon={{
              ios: "cpu",
              android: "memory",
              web: "memory",
            }}
            label="AI Model"
            value={modelLabel}
            onPress={() => router.navigate("/model")}
          />
          <SettingsRow
            icon={{
              ios: "internaldrive",
              android: "storage",
              web: "storage",
            }}
            label="Manage Storage"
            value={`${formatMegabytes(installedSizeMb())} used`}
            onPress={() => router.navigate("/packs")}
          />
          <SettingsRow
            icon={{
              ios: "bell",
              android: "notifications_none",
              web: "notifications_none",
            }}
            label="Notifications"
          />
          <SettingsRow
            icon={{
              ios: "lock.shield",
              android: "shield",
              web: "shield",
            }}
            label="Privacy & Offline"
            onPress={() => router.navigate("/setup")}
          />
          <SettingsRow
            icon={{
              ios: "questionmark.circle",
              android: "help_outline",
              web: "help_outline",
            }}
            label="Help & About"
          />
        </SettingsGroup>

        <SettingsGroup>
          <SettingsRow
            first
            icon={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
            label="Replay welcome tour"
            onPress={resetTour}
          />
        </SettingsGroup>

        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          Replaying the tour is how you change your topics of interest.
        </ThemedText>
      </ScrollView>

      <OptionSheet
        title="Appearance"
        visible={sheet === "appearance"}
        options={APPEARANCE_OPTIONS}
        value={themeMode}
        onSelect={setThemeMode}
        onClose={() => setSheet(null)}
      />
      <OptionSheet
        title="Language"
        visible={sheet === "language"}
        options={LANGUAGE_OPTIONS}
        value={language}
        onSelect={(next) => setLanguage(next as OnboardingLanguage)}
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
