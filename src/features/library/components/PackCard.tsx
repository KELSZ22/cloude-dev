import { Image } from "expo-image";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { formatCount, type KnowledgePackCard } from "../catalog";

type PackCardProps = {
  pack: KnowledgePackCard;
  status: "ready" | "downloading" | "installed";
  progress: number;
  onPress: () => void;
};

export function PackCard({ pack, status, progress, onPress }: PackCardProps) {
  const colors = useTheme();
  const meta = `${formatCount(pack.articles)} articles · ${pack.sizeMb} MB`;
  const label =
    status === "installed" ? "Downloaded" : status === "downloading" ? `${Math.round(progress * 100)}%` : "Download";

  return (
    <View
      style={[styles.card, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}
    >
      <Image source={pack.image} contentFit="cover" style={styles.thumb} accessibilityLabel="" />
      <View style={styles.copy}>
        <ThemedText type="smallBold">{pack.title}</ThemedText>
        <ThemedText type="small" style={{ color: colors.tint }}>
          {meta}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.description}>
          {pack.description}
        </ThemedText>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          status === "installed" ? `${pack.title} downloaded` : `${label} ${pack.title}`
        }
        accessibilityState={{ disabled: status === "installed" }}
        disabled={status === "installed"}
        onPress={onPress}
        style={({ pressed }) => [
          styles.action,
          {
            backgroundColor: status === "installed" ? colors.backgroundSelected : colors.tint,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <ThemedText
          type="smallBold"
          style={{ color: status === "installed" ? colors.tint : colors.backgroundElement }}
        >
          {label}
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginHorizontal: Spacing.three,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  thumb: { width: 72, height: 72, borderRadius: 16 },
  copy: { flex: 1, gap: 2 },
  description: { fontSize: 12, lineHeight: 16 },
  action: {
    minWidth: 88,
    minHeight: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
