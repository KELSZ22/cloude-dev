import { Image } from "expo-image";
import { router } from "expo-router";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";

import type { CatalogArticle, SearchKind } from "../catalog";

const kindKey: Record<SearchKind, MessageKey> = {
  article: "search.article",
  document: "search.document",
  pack: "search.pack",
};

export function ResultCard({ article }: { article: CatalogArticle }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const meta =
    article.kind === "pack"
      ? t("search.packReady")
      : t("search.readMeta", {
          kind: t(kindKey[article.kind]),
          minutes: article.readMinutes,
        });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${article.title}. ${article.pack}. ${meta}`}
      onPress={() => {
        if (article.kind === "pack") {
          router.navigate("/(tabs)/library");
          return;
        }
        router.push(`/article/${article.id}`);
      }}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: pressed ? colors.backgroundSelected : colors.backgroundElement,
          borderColor: colors.dashboardBorder,
        },
      ]}
    >
      <Image source={article.image} contentFit="cover" style={styles.thumb} accessibilityLabel="" />
      <View style={styles.copy}>
        <ThemedText type="smallBold" numberOfLines={2}>
          {article.title}
        </ThemedText>
        <ThemedText type="small" style={[styles.pack, { color: colors.tint }]} numberOfLines={1}>
          {article.kind === "document"
            ? article.pack
            : t("search.fromPack", { pack: article.pack })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2} style={styles.summary}>
          {article.summary}
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
  thumb: { width: 84, height: 84, borderRadius: 14 },
  copy: { flex: 1, gap: 2 },
  pack: { fontSize: 12, lineHeight: 16 },
  summary: { fontSize: 12, lineHeight: 16 },
  meta: { fontSize: 12, lineHeight: 16, marginTop: 2 },
});
