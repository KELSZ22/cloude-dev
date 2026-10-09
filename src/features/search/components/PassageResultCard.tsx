import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import type { SearchHit } from "@/infrastructure/database";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

/** A passage found in the local library. Mirrors `ResultCard`, and opens the stored passage. */
export function PassageResultCard({ hit }: { hit: SearchHit }) {
  const colors = useTheme();
  const source = hit.packName ? `From ${hit.packName}` : "From your documents";
  const meta = [hit.document.chapter, "Passage"].filter(Boolean).join(" · ");

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${hit.document.title}. ${source}. ${meta}`}
      onPress={() =>
        router.push({
          pathname: "/passage/[chunkId]",
          params: { chunkId: hit.chunkId },
        })
      }
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
          borderColor: colors.dashboardBorder,
        },
      ]}
    >
      <View style={[styles.thumb, { backgroundColor: colors.backgroundSelected }]}>
        <SymbolView
          name={{ ios: "book", android: "menu_book", web: "menu_book" }}
          size={34}
          tintColor={colors.tint}
        />
      </View>
      <View style={styles.copy}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {hit.document.title}
        </ThemedText>
        <ThemedText type="small" style={[styles.pack, { color: colors.tint }]} numberOfLines={1}>
          {source}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.summary}>
          {hit.excerpt}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {meta}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    gap: 12,
    marginHorizontal: Spacing.three,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  thumb: { width: 84, height: 84, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  copy: { flex: 1, gap: 2 },
  pack: { fontSize: 12, lineHeight: 16 },
  summary: { fontSize: 12, lineHeight: 16 },
  meta: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});
