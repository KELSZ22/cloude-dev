import { StyleSheet, Switch, View } from "react-native";

import { ActionButton } from "@/shared/components/action-button";
import { NavigationButton } from "@/shared/components/navigation-button";
import { Page } from "@/shared/components/page";
import { StatusCard } from "@/shared/components/status-card";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import {
  ONBOARDING_TOPICS,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";
import { useThemeStore } from "@/shared/stores/theme-store";

export default function SettingsPage() {
  const colors = useTheme();
  const isDark = useColorScheme() === "dark";
  const themeMode = useThemeStore((state) => state.mode);
  const setThemeMode = useThemeStore((state) => state.setMode);
  const language = useOnboardingStore((state) => state.language);
  const topics = useOnboardingStore((state) => state.topics);
  const resetTour = useOnboardingStore((state) => state.resetTour);

  return (
    <Page
      title="Settings"
      description="Appearance, offline readiness, and your preferences."
    >
      <StatusCard
        title="Appearance"
        description="Choose a light or dark look for the app."
      >
        <View style={styles.themeRow}>
          <View style={styles.themeLabel}>
            <ThemedText type="smallBold">Dark mode</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {isDark ? "Dark theme is on" : "Light theme is on"}
            </ThemedText>
          </View>
          <Switch
            accessibilityLabel="Dark mode"
            accessibilityHint="Switch between the light and dark themes"
            value={isDark}
            onValueChange={(enabled) => setThemeMode(enabled ? "dark" : "light")}
            trackColor={{ false: colors.disabled, true: colors.tint }}
            ios_backgroundColor={colors.disabled}
          />
        </View>
        {themeMode === "system" ? (
          <ThemedText type="small" themeColor="textSecondary">
            Following your device theme.
          </ThemedText>
        ) : (
          <ActionButton
            label="Use device theme"
            onPress={() => setThemeMode("system")}
          />
        )}
      </StatusCard>
      <StatusCard
        title="Your preferences"
        description={`Language: ${language}. Topics: ${
          topics.length
            ? topics
                .map(
                  (id) =>
                    ONBOARDING_TOPICS.find((topic) => topic.id === id)?.label ??
                    id,
                )
                .join(", ")
            : "none selected yet"
        }.`}
      >
        <ActionButton label="Replay welcome tour" onPress={resetTour} />
      </StatusCard>
      <NavigationButton href="/setup" label="Offline readiness checklist" />
      <NavigationButton href="/model" label="On-device model status" />
      <StatusCard
        title="Local by design"
        description="No sign-in or cloud inference. The current shell has no search or inference network calls."
      />
      <ThemedText type="small" themeColor="textSecondary">
        Replay the tour to change language and topics from the first-run flow.
      </ThemedText>
    </Page>
  );
}
const styles = StyleSheet.create({
  themeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.three,
    minHeight: 56,
  },
  themeLabel: { flex: 1, gap: Spacing.one },
});
