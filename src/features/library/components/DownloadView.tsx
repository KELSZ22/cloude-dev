import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { formatCount, type KnowledgePackCard } from "../catalog";

type DownloadViewProps = {
  pack: KnowledgePackCard;
  progress: number;
  paused: boolean;
  downloadedMb?: number;
  totalMb?: number;
  speedMbps?: number;
  onBack: () => void;
  onTogglePause: () => void;
  onCancel: () => void;
};

export function DownloadView({
  pack,
  progress,
  paused,
  downloadedMb,
  totalMb,
  speedMbps,
  onBack,
  onTogglePause,
  onCancel,
}: DownloadViewProps) {
  const colors = useTheme();
  const percent = Math.round(progress * 100);
  const total = totalMb ?? pack.sizeMb;
  const downloaded = downloadedMb ?? Math.round(pack.sizeMb * progress);
  const speed = speedMbps ?? (paused ? 0 : 8.2);
  const remainingMb = Math.max(0, total - downloaded);
  const remainingMinutes =
    speed > 0.05 ? Math.max(1, Math.round(remainingMb / speed / 60)) : null;

  return (
    <View style={styles.wrap}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back to packs" onPress={onBack} style={styles.iconButton}>
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          Downloading Pack
        </ThemedText>
        <View style={styles.iconButton} />
      </View>

      <View style={[styles.hero, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
        <Image source={pack.image} contentFit="cover" style={styles.heroImage} accessibilityLabel="" />
        <View style={styles.heroCopy}>
          <ThemedText type="smallBold">{pack.title}</ThemedText>
          <ThemedText type="small" style={{ color: colors.tint }}>
            {`${formatCount(pack.articles)} articles · ${pack.sizeMb} MB`}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.description}>
            {pack.description}
          </ThemedText>
        </View>
      </View>

      <View style={styles.progressBlock}>
        <View style={styles.progressLabels}>
          <ThemedText type="smallBold">{paused ? "Paused" : "Downloading..."}</ThemedText>
          <ThemedText type="smallBold" style={{ color: colors.tint }}>
            {`${percent}%`}
          </ThemedText>
        </View>
        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
          <View style={[styles.fill, { width: `${percent}%`, backgroundColor: colors.tint }]} />
        </View>
        <ThemedText type="small" themeColor="textSecondary">
          {`${downloaded} MB of ${total} MB`}
        </ThemedText>
      </View>

      <View style={styles.stats}>
        <View style={[styles.stat, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
          <SymbolView name={{ ios: "clock", android: "schedule", web: "schedule" }} size={18} tintColor={colors.tint} />
          <ThemedText type="smallBold">
            {remainingMinutes ? `${remainingMinutes} min` : "—"}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            remaining
          </ThemedText>
        </View>
        <View style={[styles.stat, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}>
          <SymbolView name={{ ios: "speedometer", android: "speed", web: "speed" }} size={18} tintColor={colors.tint} />
          <ThemedText type="smallBold">{`${speed.toFixed(1)} MB/s`}</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            speed
          </ThemedText>
        </View>
      </View>

      <View style={[styles.note, { backgroundColor: colors.backgroundSelected }]}>
        <SymbolView name={{ ios: "info.circle", android: "info", web: "info" }} size={18} tintColor={colors.tint} />
        <ThemedText type="small" style={styles.noteText}>
          You can continue using Seekora while downloading in the background.
        </ThemedText>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={paused ? "Resume download" : "Pause download"}
        onPress={onTogglePause}
        style={({ pressed }) => [styles.pause, { backgroundColor: pressed ? colors.tintPressed : colors.tint }]}
      >
        <SymbolView
          name={{
            ios: paused ? "play.fill" : "pause.fill",
            android: paused ? "play_arrow" : "pause",
            web: paused ? "play_arrow" : "pause",
          }}
          size={18}
          tintColor={colors.backgroundElement}
        />
        <ThemedText type="smallBold" style={{ color: colors.backgroundElement }}>
          {paused ? "Resume" : "Pause"}
        </ThemedText>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Cancel download"
        onPress={onCancel}
        style={[styles.cancel, { borderColor: colors.tint }]}
      >
        <ThemedText type="smallBold" style={{ color: colors.tint }}>
          Cancel
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.three, paddingBottom: Spacing.four },
  toolbar: { flexDirection: "row", alignItems: "center", paddingHorizontal: Spacing.two },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  title: { flex: 1, textAlign: "center", fontSize: 18, lineHeight: 24 },
  hero: { marginHorizontal: Spacing.three, borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  heroImage: { height: 140, width: "100%" },
  heroCopy: { padding: Spacing.three, gap: 4 },
  description: { fontSize: 13, lineHeight: 18 },
  progressBlock: { marginHorizontal: Spacing.three, gap: 8 },
  progressLabels: { flexDirection: "row", justifyContent: "space-between" },
  track: { height: 10, borderRadius: 6, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 6 },
  stats: { flexDirection: "row", gap: 12, marginHorizontal: Spacing.three },
  stat: { flex: 1, borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: 2 },
  note: { marginHorizontal: Spacing.three, borderRadius: 16, padding: Spacing.three, flexDirection: "row", gap: 10 },
  noteText: { flex: 1 },
  pause: {
    marginHorizontal: Spacing.three,
    minHeight: 52,
    borderRadius: 26,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  cancel: {
    marginHorizontal: Spacing.three,
    minHeight: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
});
