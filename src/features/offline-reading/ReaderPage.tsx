import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { listWikipediaFigureReferences } from "@/infrastructure/learning/wikipedia";

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
import { Spacing } from "@/shared/constants/theme";
import { topicLabelKey } from "@/shared/constants/topics";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import { readingRepository } from "@/shared/stores/offline-reading-store";
import { ONBOARDING_TOPIC_IDS } from "@/shared/stores/onboarding-store";
import { useReadingHistoryStore } from "@/shared/stores/reading-history-store";
import { useTopicPackStore } from "@/shared/stores/topic-pack-store";
import type { DisplayFigure, OpenedReading, ReadingSection } from "@/shared/types/offline-reading";

import { ArticleFigure } from "./components/ArticleFigure";

export default function ReaderPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LocalReader key={id} id={typeof id === "string" ? id : ""} />;
}

function LocalReader({ id }: { id: string }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<OpenedReading | null>(null);
  const [overPhoto, setOverPhoto] = useState(true);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);
  const [references, setReferences] = useState<DisplayFigure[]>([]);
  const listRef = useRef<FlatList<ReaderRow>>(null);

  useEffect(() => {
    let active = true;
    // Saved article text stays on this device. Image references load separately when none were saved.
    void readingRepository.get(typeof id === "string" ? id : "").then((saved) => {
      if (active) setArticle(saved);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, attempt]);

  useEffect(() => {
    if (!article) return;
    useReadingHistoryStore.getState().record({
      id: article.id,
      title: article.title,
      source: "Wikipedia",
    });
  }, [article]);

  useEffect(() => {
    if (!article || article.figures.length > 0) return;
    let active = true;
    void listWikipediaFigureReferences(article.pageId, article.language)
      .then((items) => { if (active) setReferences(items); })
      .catch(() => undefined);
    return () => { active = false; };
  }, [article]);

  const figures = article?.figures.length ? article.figures : references;
  const hero = figures[0] ?? null;
  const bodyFigures = hero ? figures.slice(1) : figures;
  const articleIds = useTopicPackStore((state) => state.articleIds);
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);
  const { rows, sectionStarts } = useMemo(
    () => article
      ? articleRows(article.sections, bodyFigures, t("reading.introduction"))
      : { rows: [] as ReaderRow[], sectionStarts: [] as number[] },
    [article, bodyFigures, t],
  );

  if (loading || !article) {
    return (
      <ThemedView style={styles.missing}>
        {loading ? <ActivityIndicator color={colors.tint} accessibilityLabel={t("reading.loading")} /> : (
          <>
            <ThemedText accessibilityRole="alert">{failed ? t("reading.errors.storage") : t("reading.missing")}</ThemedText>
            <ActionButton label={t("reading.retry")} onPress={() => {
              setLoading(true); setFailed(false); setAttempt((value) => value + 1);
            }} />
          </>
        )}
      </ThemedView>
    );
  }

  function jumpToSection(index: number) {
    setContentsOpen(false);
    const row = sectionStarts[index];
    if (row === undefined) return;
    listRef.current?.scrollToIndex({ index: row, viewPosition: 0 });
  }

  const reading = article;
  const topicId = ONBOARDING_TOPIC_IDS.find((topic) =>
    (articleIds[topic] ?? []).includes(reading.id),
  );
  const source = topicId ? t(topicLabelKey[topicId]) : "Wikipedia";
  const lead = splitLead(reading.summary);

  function ask() {
    openAssistant({
      articleTitle: reading.title,
      pageText: reading.sections
        .map((section) => [section.title, ...section.paragraphs].filter(Boolean).join("\n"))
        .join("\n\n"),
    });
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: colors.backgroundWarm }]}>
      <FlatList ref={listRef} data={rows}
        keyExtractor={(item) => item.key} initialNumToRender={12} extraData={largeText}
        onScrollToIndexFailed={(info) => {
          listRef.current?.scrollToOffset({ offset: info.averageItemLength * info.index, animated: false });
          setTimeout(() => listRef.current?.scrollToIndex({ index: info.index, viewPosition: 0 }), 80);
        }}
        contentContainerStyle={{ paddingBottom: insets.bottom + Spacing.five, width: "100%", maxWidth: 680, alignSelf: "center" }}
        scrollEventThrottle={32}
        onScroll={(event) => {
          const next = event.nativeEvent.contentOffset.y < ARTICLE_HERO_HEIGHT - 72;
          setOverPhoto((current) => (current === next ? current : next));
        }}
        ListHeaderComponent={
          <View>
            <ArticleHero image={hero ? { uri: hero.uri } : null} fit="contain" />
            <View style={styles.intro}>
            <ArticleIntro title={article.title} source={source} minutes={article.readMinutes} />
            {lead.overview ? (
              <>
                <ThemedText type="subtitle" accessibilityRole="header" style={[styles.sectionTitle, { color: colors.brand }]}>
                  {t("article.overview")}
                </ThemedText>
                <ThemedText selectable style={styles.lead}>{lead.overview}</ThemedText>
              </>
            ) : null}
            <ArticleCallout text={lead.callout} />
            <View style={styles.toolbar}>
              <Pressable accessibilityRole="button" accessibilityState={{ expanded: contentsOpen }}
                onPress={() => setContentsOpen((value) => !value)} style={styles.tool}>
                <ThemedText type="smallBold" themeColor="tint">{t("reading.contents")}</ThemedText>
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityState={{ selected: largeText }}
                onPress={() => setLargeText((value) => !value)} style={styles.tool}>
                <ThemedText type="smallBold" themeColor="tint">{largeText ? t("reading.normalText") : t("reading.largeText")}</ThemedText>
              </Pressable>
            </View>
            {contentsOpen ? (
              <View style={[styles.contents, { backgroundColor: colors.backgroundElement }]}>
                {article.sections.map((entry, index) => (
                  <Pressable key={index} accessibilityRole="button"
                    onPress={() => jumpToSection(index)} style={[styles.chapter, { paddingLeft: Spacing.three + Math.max(0, entry.level - 2) * 10 }]}>
                    <ThemedText type="small">
                      {index + 1}. {entry.title || t("reading.introduction")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.kind === "figure") {
            return (
              <View style={styles.figure}>
                <ArticleFigure figure={item.figure} />
              </View>
            );
          }
          if (item.kind === "heading") {
            return (
              <ThemedText
                type={item.level <= 2 ? "subtitle" : "smallBold"}
                accessibilityRole="header"
                style={[styles.heading, item.level > 2 && styles.nestedHeading]}
              >
                {item.title}
              </ThemedText>
            );
          }
          return <ThemedText selectable style={[styles.paragraph, largeText && styles.largeParagraph]}>{item.text}</ThemedText>;
        }}
        ListFooterComponent={
          <View style={styles.footer}>
            <View style={[styles.attribution, { borderColor: colors.border }]}>
              <ThemedText type="smallBold">{t("reading.sourceTitle")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">{t("reading.credit")}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {article.figures.length ? t("reading.illustratedEdition") : t("reading.textEdition")}
              </ThemedText>
              <ExternalLink href={article.sourceUrl}><ThemedText type="link" themeColor="tint">{t("reading.original")} · {article.revisionId}</ThemedText></ExternalLink>
              <ThemedText selectable type="small" themeColor="textSecondary">{article.sourceUrl}</ThemedText>
              <ExternalLink href={article.historyUrl}><ThemedText type="link" themeColor="tint">{t("reading.contributors")}</ThemedText></ExternalLink>
              <ExternalLink href={article.licenseUrl}><ThemedText type="link" themeColor="tint">{article.license}</ThemedText></ExternalLink>
              <ThemedText type="small" themeColor="textSecondary">{t("reading.sourceOnline")}</ThemedText>
            </View>
          </View>
        } />
      <ArticleTopBar
        onBack={() => router.back()}
        onAsk={ask}
        onPhoto={hero !== null && overPhoto}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
  intro: { paddingHorizontal: Spacing.four, paddingTop: Spacing.four, gap: Spacing.two },
  sectionTitle: { fontSize: 22, lineHeight: 28 },
  lead: { fontSize: 16, lineHeight: 26, marginBottom: Spacing.two },
  toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: Spacing.two },
  tool: { minHeight: 48, justifyContent: "center", paddingHorizontal: Spacing.two },
  contents: { borderRadius: 16, paddingVertical: Spacing.two },
  chapter: { minHeight: 44, justifyContent: "center", paddingVertical: Spacing.two, paddingRight: Spacing.three },
  heading: { marginTop: Spacing.three, marginBottom: Spacing.two, marginHorizontal: Spacing.four, fontSize: 22, lineHeight: 28 },
  nestedHeading: { marginTop: Spacing.two, fontSize: 18, lineHeight: 24 },
  paragraph: { fontSize: 16, lineHeight: 26, marginBottom: Spacing.three, marginHorizontal: Spacing.four },
  figure: { marginHorizontal: Spacing.four },
  largeParagraph: { fontSize: 22, lineHeight: 36 },
  footer: { gap: Spacing.three, marginTop: Spacing.three, marginHorizontal: Spacing.four },
  attribution: { borderTopWidth: 1, paddingTop: Spacing.four, gap: Spacing.two, marginTop: Spacing.three },
});

type ReaderRow =
  | { kind: "heading"; key: string; title: string; level: number }
  | { kind: "text"; key: string; text: string }
  | { kind: "figure"; key: string; figure: DisplayFigure };

function splitLead(summary: string) {
  const text = summary.trim();
  const match = text.match(/^(.+?[.!?])\s+([\s\S]+)$/);
  if (!match) return { callout: "", overview: text };
  const rest = match[2];
  // A follow-on sentence that starts with a pronoun belongs with the overview.
  if (/^(it|this|these|those|they|that|he|she|there)\b/i.test(rest)) {
    return { callout: "", overview: text };
  }
  return { callout: match[1], overview: rest };
}

function articleRows(sections: ReadingSection[], figures: DisplayFigure[], introduction: string) {
  const slots = sections.map(() => [] as DisplayFigure[]);
  figures.forEach((figure, index) => {
    slots[sections.length ? index % sections.length : 0]?.push(figure);
  });
  const rows: ReaderRow[] = [];
  const sectionStarts: number[] = [];
  sections.forEach((section, index) => {
    sectionStarts.push(rows.length);
    rows.push({
      kind: "heading",
      key: `h-${index}`,
      title: section.title || introduction,
      level: section.level,
    });
    const text = section.paragraphs.map((value, paragraph) => ({
      kind: "text" as const,
      key: `p-${index}-${paragraph}`,
      text: value,
    }));
    const media = slots[index].map((figure) => ({ kind: "figure" as const, key: figure.id, figure }));
    if (!text.length) rows.push(...media);
    else rows.push(text[0], ...media, ...text.slice(1));
  });
  return { rows, sectionStarts };
}
