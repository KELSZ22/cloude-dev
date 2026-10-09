import type { ImageSource } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/shared/components/action-button";
import {
  ARTICLE_HERO_HEIGHT,
  ArticleCallout,
  ArticleHero,
  ArticleIntro,
  ArticleTopBar,
} from "@/shared/components/article-chrome";
import { ExternalLink } from "@/shared/components/external-link";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { packArtwork } from "@/shared/content/openstax/pack-presentation";
import { openStaxPackById } from "@/shared/content/openstax/initial-resources";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import { useSavedCatalogStore } from "@/shared/stores/saved-catalog-store";

import { articleById, catalogSections, type CatalogArticle } from "./catalog";

export default function ArticlePage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const articleId = typeof id === "string" ? id : "";
  return <CatalogReader key={articleId} id={articleId} />;
}

function CatalogReader({ id }: { id: string }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const article = articleById(id);
  const [overPhoto, setOverPhoto] = useState(true);
  const saved = useSavedCatalogStore((state) => state.items.some((item) => item.id === id));
  const saveCatalog = useSavedCatalogStore((state) => state.save);
  const removeCatalog = useSavedCatalogStore((state) => state.remove);
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);

  if (!article || article.kind === "pack") {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText accessibilityRole="alert">{t("article.notFound")}</ThemedText>
        <ActionButton label={t("article.backToSearch")} onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const sections = catalogSections(article).filter((section) => section.title);
  const pageText = [article.overview, article.highlight, ...sections.flatMap((section) => [section.title, ...section.paragraphs])]
    .filter(Boolean)
    .join("\n\n");

  const piece = article;

  function ask() {
    openAssistant({ articleTitle: piece.title, pageText });
  }

  function toggleBookmark() {
    if (saved) {
      removeCatalog(piece.id);
      return;
    }
    saveCatalog({
      id: piece.id,
      title: piece.title,
      pack: piece.pack,
      summary: piece.summary,
      readMinutes: piece.readMinutes,
    });
  }

  const sourcePage = httpsPage(article.sourcePage);
  const image = heroImage(article);

  return (
    <ThemedView style={[styles.screen, { backgroundColor: colors.backgroundWarm }]}>
      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={32}
        onScroll={(event) => {
          const next = event.nativeEvent.contentOffset.y < ARTICLE_HERO_HEIGHT - 72;
          setOverPhoto((current) => (current === next ? current : next));
        }}
      >
        <ArticleHero image={image} />
        <View style={styles.body}>
          <ArticleIntro title={article.title} source={article.pack} minutes={article.readMinutes} />
          <ThemedText type="subtitle" accessibilityRole="header" style={[styles.sectionTitle, { color: colors.brand }]}>
            {t("article.overview")}
          </ThemedText>
          <ThemedText selectable style={styles.paragraph}>{article.overview || article.summary}</ThemedText>
          <ArticleCallout text={finishedSentence(article.highlight)} />
          {sections.map((section, index) => (
            <View key={`${section.title}-${index}`}>
              <ThemedText type="subtitle" accessibilityRole="header" style={[styles.sectionTitle, { color: colors.brand }]}>
                {section.title}
              </ThemedText>
              {section.paragraphs.map((paragraph, paragraphIndex) => (
                <ThemedText key={paragraphIndex} selectable style={styles.paragraph}>
                  {paragraph}
                </ThemedText>
              ))}
            </View>
          ))}
          <View style={[styles.attribution, { borderColor: colors.border }]}>
            <ThemedText type="smallBold">{t("reading.sourceTitle")}</ThemedText>
            {sections.length ? (
              <ThemedText type="small" themeColor="textSecondary">{t("article.studyCredit")}</ThemedText>
            ) : null}
            {article.licenseName ? (
              <ThemedText type="small" themeColor="textSecondary">{article.licenseName}</ThemedText>
            ) : null}
            {sourcePage ? (
              <ExternalLink href={sourcePage}>
                <ThemedText type="link" themeColor="tint">{sourcePage}</ThemedText>
              </ExternalLink>
            ) : null}
          </View>
        </View>
      </ScrollView>
      <ArticleTopBar
        onBack={() => router.back()}
        onBookmark={toggleBookmark}
        bookmarked={saved}
        onAsk={ask}
        onPhoto={image !== null && overPhoto}
      />
    </ThemedView>
  );
}

function heroImage(article: CatalogArticle): ImageSource | null {
  const source = article.image;
  const uri = source && typeof source === "object" && "uri" in source && typeof source.uri === "string"
    ? source.uri
    : null;
  if (uri && !uri.endsWith(".svg")) return source;
  const pack = openStaxPackById(article.packId);
  return pack ? packArtwork(pack.id, pack.category) : source;
}

function finishedSentence(text: string) {
  const trimmed = text.trim();
  if (!trimmed || /[.!?]["')\]]*$/.test(trimmed)) return trimmed;
  const end = Math.max(trimmed.lastIndexOf("."), trimmed.lastIndexOf("!"), trimmed.lastIndexOf("?"));
  return end > 40 ? trimmed.slice(0, end + 1) : trimmed;
}

function httpsPage(value: string | null | undefined): `https://${string}` | null {
  if (typeof value === "string" && value.startsWith("https://")) return value as `https://${string}`;
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
  scroll: { width: "100%", maxWidth: 680, alignSelf: "center" },
  body: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four },
  sectionTitle: { fontSize: 22, lineHeight: 28, marginBottom: Spacing.two },
  paragraph: { fontSize: 16, lineHeight: 26, marginBottom: Spacing.three },
  attribution: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: Spacing.four, gap: Spacing.two, marginTop: Spacing.two },
});
