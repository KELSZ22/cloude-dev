import { router, useLocalSearchParams } from "expo-router";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/shared/components/action-button";
import { ExternalLink } from "@/shared/components/external-link";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useSavedResourceStore } from "@/shared/stores/saved-resource-store";

export default function SavedArticlePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = typeof id === "string" ? decodeURIComponent(id) : "";
  const article = useSavedResourceStore((state) =>
    state.items.find((item) => item.id === articleId),
  );
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();

  if (!article) {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText accessibilityRole="alert">{t("article.notFound")}</ThemedText>
        <ActionButton label={t("article.backToSearch")} onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const paragraphs = article.description
    .split(/\n+/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
  const words = paragraphs.join(" ").split(/\s+/).filter(Boolean).length;
  const minutes = Math.max(1, Math.ceil(words / 220));
  const authors = article.authors.slice(0, 6).join(", ");
  const savedOn = article.savedAt.slice(0, 10);
  const sourcePage = httpsPage(article.sourceUrl);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: colors.backgroundWarm }]}>
      <FlatList
        data={paragraphs.length ? paragraphs : [t("article.savedCitationOnly")]}
        keyExtractor={(_item, index) => `${article.id}-${index}`}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.four },
        ]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.goBack")}
              onPress={() => router.back()}
              style={styles.back}
            >
              <ThemedText type="smallBold" themeColor="tint">{t("common.back")}</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" themeColor="tint">{t("article.savedLocally")}</ThemedText>
            <ThemedText type="title" accessibilityRole="header">{article.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {article.source}
              {article.publishedAt ? ` · ${article.publishedAt}` : ""}
              {` · ${t("reading.minutes", { count: minutes })}`}
            </ThemedText>
            {authors ? (
              <ThemedText type="small" themeColor="textSecondary">{authors}</ThemedText>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t("reading.downloaded", { date: savedOn })}
            </ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedText type="default" style={styles.paragraph}>{item}</ThemedText>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {article.license ? (
              <ThemedText type="small" themeColor="textSecondary">{article.license}</ThemedText>
            ) : null}
            {article.doi ? (
              <ThemedText type="small" themeColor="textSecondary">{article.doi}</ThemedText>
            ) : null}
            {sourcePage ? <ExternalLink href={sourcePage}>{article.source}</ExternalLink> : null}
          </View>
        }
      />
    </ThemedView>
  );
}

function httpsPage(url: string): `https://${string}` | null {
  if (!url.startsWith("https://")) return null;
  return url as `https://${string}`;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, justifyContent: "center", gap: Spacing.three, padding: Spacing.four },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three, maxWidth: 760, width: "100%", alignSelf: "center" },
  header: { gap: Spacing.two, paddingBottom: Spacing.two },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  paragraph: { lineHeight: 26 },
  footer: { gap: Spacing.two, paddingTop: Spacing.three },
});
