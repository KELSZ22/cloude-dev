import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { formatCount, type KnowledgePackCard } from "../catalog";

type DownloadCompleteProps = {
  pack: KnowledgePackCard;
  onBack: () => void;
  onExplore: () => void;
  onViewLibrary: () => void;
};

export function DownloadComplete({
  pack,
  onBack,
  onExplore,
  onViewLibrary,
}: DownloadCompleteProps) {
  const colors = useTheme();

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to library"
        onPress={onBack}
        style={styles.back}
      >
        <SymbolView
          name={{
            ios: "chevron.left",
            android: "arrow_back",
            web: "arrow_back",
          }}
          size={24}
          tintColor={colors.brand}
        />
      </Pressable>

      <View style={styles.hero}>
        <Image
          source={require("@/assets/elements/left-leaves.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={styles.heroLeavesLeft}
        />
        <Image
          source={require("@/assets/elements/right-leaves.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={styles.heroLeavesRight}
        />
        <View style={styles.sparkLeft}>
          <SymbolView
            name={{ ios: "sparkle", android: "star", web: "star" }}
            size={16}
            tintColor={colors.accentGold}
          />
        </View>
        <View style={styles.sparkRight}>
          <SymbolView
            name={{ ios: "sparkle", android: "star", web: "star" }}
            size={18}
            tintColor={colors.accentGold}
          />
        </View>
        <View
          style={[styles.halo, { backgroundColor: colors.backgroundSelected }]}
        >
          <View style={[styles.check, { backgroundColor: colors.tint }]}>
            <SymbolView
              name={{ ios: "checkmark", android: "check", web: "check" }}
              size={42}
              tintColor={colors.backgroundElement}
            />
          </View>
        </View>
      </View>

      <ThemedText
        accessibilityRole="header"
        style={[styles.title, { color: colors.brand }]}
      >
        Download Complete!
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.subtitle}>
        {`${pack.title} pack is ready to use offline on your device.`}
      </ThemedText>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.dashboardBorder,
          },
        ]}
      >
        <Image
          source={pack.image}
          contentFit="cover"
          style={styles.thumb}
          accessibilityLabel=""
        />
        <View style={styles.cardCopy}>
          <ThemedText type="smallBold">{pack.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.tint }}>
            {`${formatCount(pack.articles)} articles · ${pack.sizeMb} MB`}
          </ThemedText>
          <View style={styles.ready}>
            <SymbolView
              name={{
                ios: "checkmark.circle.fill",
                android: "check_circle",
                web: "check_circle",
              }}
              size={16}
              tintColor={colors.tint}
            />
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              Ready for offline use
            </ThemedText>
          </View>
        </View>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Explore ${pack.title}`}
        onPress={onExplore}
        style={({ pressed }) => [
          styles.primary,
          { backgroundColor: pressed ? colors.tintPressed : colors.tint },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{ color: colors.backgroundElement }}
        >
          Explore Pack
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="View in Library"
        onPress={onViewLibrary}
        style={({ pressed }) => [
          styles.secondary,
          {
            borderColor: colors.tint,
            backgroundColor: pressed
              ? colors.backgroundSelected
              : "transparent",
          },
        ]}
      >
        <ThemedText type="smallBold" style={{ color: colors.tint }}>
          View in Library
        </ThemedText>
      </Pressable>

      <View pointerEvents="none" style={styles.cornerLeaves}>
        <Image
          source={require("@/assets/elements/left-leaves.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={styles.bottomLeft}
        />
        <Image
          source={require("@/assets/elements/right-leaves.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="contain"
          style={styles.bottomRight}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: Spacing.three, alignItems: "center" },
  back: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  hero: {
    width: 220,
    height: 180,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.two,
  },
  heroLeavesLeft: {
    position: "absolute",
    left: 0,
    bottom: 18,
    width: 110,
    height: 70,
  },
  heroLeavesRight: {
    position: "absolute",
    right: 0,
    bottom: 18,
    width: 110,
    height: 70,
  },
  sparkLeft: { position: "absolute", left: 28, top: 18 },
  sparkRight: { position: "absolute", right: 36, top: 8 },
  halo: {
    width: 132,
    height: 132,
    borderRadius: 66,
    alignItems: "center",
    justifyContent: "center",
  },
  check: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
    fontWeight: 700,
    textAlign: "center",
    marginTop: Spacing.two,
  },
  subtitle: {
    textAlign: "center",
    marginTop: Spacing.two,
    marginBottom: Spacing.four,
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 18,
    padding: 12,
  },
  thumb: { width: 72, height: 72, borderRadius: 14 },
  cardCopy: { flex: 1, gap: 2 },
  ready: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  primary: {
    width: "100%",
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginTop: Spacing.four,
  },
  secondary: {
    width: "100%",
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 12,
  },
  cornerLeaves: { ...StyleSheet.absoluteFill },
  bottomLeft: {
    position: "absolute",
    left: 0,
    bottom: 0,
    width: 130,
    height: 80,
  },
  bottomRight: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 130,
    height: 80,
  },
});
