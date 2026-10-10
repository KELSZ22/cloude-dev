import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { contentSources } from "@/shared/constants/content-sources";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import { ChallengeInvite } from "./components/ChallengeInvite";
import { DashboardActionCard } from "./components/DashboardActionCard";
import { DashboardHero } from "./components/DashboardHero";
import { SuggestedPacks } from "./components/SuggestedPacks";

export default function HomePage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHero />
        <View style={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("home.askAi")}
            onPress={() => openAssistant()}
            style={({ pressed }) => [
              styles.askBar,
              {
                borderColor: colors.dashboardBorder,
                backgroundColor: pressed
                  ? colors.backgroundSelected
                  : colors.backgroundElement,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: "sparkles",
                android: "auto_awesome",
                web: "auto_awesome",
              }}
              size={24}
              tintColor={colors.tint}
            />
            <ThemedText type="smallBold" style={styles.grow}>
              {t("home.askAi")}
            </ThemedText>
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>

          <View style={styles.section}>
            <ThemedText
              type="subtitle"
              accessibilityRole="header"
              style={styles.sectionTitle}
            >
              {t("home.getStarted")}
            </ThemedText>
            <View style={styles.grid}>
              <DashboardActionCard
                variant="readLearn"
                label={t(contentSources.openStax ? "home.explorePacks" : "home.readAndLearn")}
                title={t(
                  contentSources.openStax ? "home.explorePacksTitle" : "home.readAndLearnTitle",
                )}
                subtitle={t(
                  contentSources.openStax
                    ? "home.explorePacksSubtitle"
                    : "home.readAndLearnSubtitle",
                )}
                href={contentSources.openStax ? "/packs" : "/(tabs)/search"}
              />
              <DashboardActionCard
                variant="library"
                label={t("home.viewLibrary")}
                title={t("home.viewLibraryTitle")}
                subtitle={t("home.viewLibrarySubtitle")}
                href="/(tabs)/library"
              />
            </View>
            <ChallengeInvite />
          </View>
          <SuggestedPacks />
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingBottom: Spacing.three,
  },
  content: { marginTop: -28, paddingHorizontal: Spacing.three, gap: 12 },
  askBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 20,
    boxShadow: "0 3px 9px rgba(4, 120, 87, 0.12)",
  },
  grow: { flex: 1 },
  section: { gap: 12, marginTop: Spacing.one },
  sectionTitle: { fontSize: 18, lineHeight: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
});
