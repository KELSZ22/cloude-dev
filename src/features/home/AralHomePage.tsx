import { SymbolView } from "expo-symbols";
import { useCallback, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

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

/** Matches the content block’s negative margin so the pin threshold aligns with the bar’s top edge. */
const ASK_BAR_OVERLAP = 28;

type ThemePalette = ReturnType<typeof useTheme>;

function AskAiBar({
  colors,
  label,
  onPress,
}: {
  colors: ThemePalette;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.askBar,
        {
          borderColor: colors.dashboardBorder,
          backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
        },
      ]}
    >
      <SymbolView
        name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
        size={24}
        tintColor={colors.tint}
      />
      <ThemedText type="smallBold" style={styles.grow}>
        {label}
      </ThemedText>
      <SymbolView
        name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
        size={20}
        tintColor={colors.textSecondary}
      />
    </Pressable>
  );
}

export default function HomePage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);
  const [heroHeight, setHeroHeight] = useState(0);
  const [askPinned, setAskPinned] = useState(false);

  const pinThreshold = Math.max(0, heroHeight - ASK_BAR_OVERLAP);
  const askLabel = t("home.askAi");
  const openAsk = useCallback(() => openAssistant(), [openAssistant]);

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      setAskPinned((pinned) => {
        const next = y >= pinThreshold;
        return pinned === next ? pinned : next;
      });
    },
    [pinThreshold],
  );

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      {askPinned ? (
        <View
          pointerEvents="box-none"
          style={[styles.pinned, { paddingTop: insets.top + Spacing.two }]}
        >
          <View style={styles.pinnedInner}>
            <AskAiBar colors={colors} label={askLabel} onPress={openAsk} />
          </View>
        </View>
      ) : null}
      <ScrollView
        contentContainerStyle={styles.scroll}
        scrollEventThrottle={16}
        showsVerticalScrollIndicator={false}
        onScroll={onScroll}
      >
        <View onLayout={(event) => setHeroHeight(event.nativeEvent.layout.height)}>
          <DashboardHero />
        </View>
        <View style={styles.content}>
          <AskAiBar colors={colors} label={askLabel} onPress={openAsk} />

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
  content: { marginTop: -ASK_BAR_OVERLAP, paddingHorizontal: Spacing.three, gap: 12 },
  pinned: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
    paddingBottom: Spacing.two,
  },
  pinnedInner: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
  },
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
