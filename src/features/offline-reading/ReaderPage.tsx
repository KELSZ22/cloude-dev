import { useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/shared/components/action-button";
import { ExternalLink } from "@/shared/components/external-link";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { readingRepository } from "@/shared/stores/offline-reading-store";
import type { DisplayFigure, OpenedReading } from "@/shared/types/offline-reading";

import { ArticleFigure } from "./components/ArticleFigure";

export default function ReaderPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <LocalReader key={id} id={typeof id === "string" ? id : ""} />;
}

function LocalReader({ id }: { id: string }) {
  const { t, locale } = useTranslation();
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [article, setArticle] = useState<OpenedReading | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    let active = true;
    // Reading never calls Wikipedia or opens a remote WebView.
    void readingRepository.get(typeof id === "string" ? id : "").then((saved) => {
      if (active) setArticle(saved);
    }).catch(() => {
      if (active) setFailed(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [id, attempt]);

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

  const section = article.sections[sectionIndex];
  const sectionTitle = section.title || t("reading.introduction");
  const rows = readerRows(section.paragraphs, sectionIndex === 0 ? article.figures : []);
  function changeSection(index: number) { setSectionIndex(index); setContentsOpen(false); }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: colors.backgroundWarm }]}>
      <FlatList key={`${article.id}-${sectionIndex}`} data={rows}
        keyExtractor={(item) => item.key} initialNumToRender={8}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + Spacing.four }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <ThemedText type="smallBold" themeColor="tint">
              {article.figures.length ? t("reading.availableIllustrated") : t("reading.available")}
            </ThemedText>
            <ThemedText type="title" accessibilityRole="header">{article.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Wikipedia · {article.language === "en" ? "English" : "Tagalog"} · {t("reading.minutes", { count: article.readMinutes })}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">{t("reading.downloadedOn", {
              date: new Date(article.downloadedAt).toLocaleDateString(locale === "fil" ? "fil-PH" : "en-US"),
            })}</ThemedText>
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
                  <Pressable key={index} accessibilityRole="button" accessibilityState={{ selected: index === sectionIndex }}
                    onPress={() => changeSection(index)} style={[styles.chapter, { paddingLeft: Spacing.three + Math.max(0, entry.level - 2) * 10 }]}>
                    <ThemedText type="small" themeColor={index === sectionIndex ? "tint" : "text"}>
                      {index + 1}. {entry.title || t("reading.introduction")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">{t("reading.sectionProgress", { current: sectionIndex + 1, total: article.sections.length })}</ThemedText>
            <ThemedText type="subtitle" accessibilityRole="header">{sectionTitle}</ThemedText>
          </View>
        }
        renderItem={({ item }) => item.kind === "figure"
          ? <ArticleFigure figure={item.figure} />
          : <ThemedText selectable style={[styles.paragraph, largeText && styles.largeParagraph]}>{item.text}</ThemedText>}
        ListFooterComponent={
          <View style={styles.footer}>
            {sectionIndex > 0 ? <ActionButton label={t("reading.previous")} onPress={() => changeSection(sectionIndex - 1)} /> : null}
            {sectionIndex < article.sections.length - 1 ? <ActionButton label={t("reading.next")} onPress={() => changeSection(sectionIndex + 1)} /> : null}
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
  content: { padding: Spacing.four, width: "100%", maxWidth: 680, alignSelf: "center" },
  header: { gap: Spacing.two, marginBottom: Spacing.four },
  toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: Spacing.two },
  tool: { minHeight: 48, justifyContent: "center", paddingHorizontal: Spacing.two },
  contents: { borderRadius: 16, paddingVertical: Spacing.two },
  chapter: { minHeight: 44, justifyContent: "center", paddingVertical: Spacing.two, paddingRight: Spacing.three },
  paragraph: { fontSize: 18, lineHeight: 30, marginBottom: Spacing.three },
  largeParagraph: { fontSize: 22, lineHeight: 36 },
  footer: { gap: Spacing.three, marginTop: Spacing.three },
  attribution: { borderTopWidth: 1, paddingTop: Spacing.four, gap: Spacing.two, marginTop: Spacing.three },
});

type ReaderRow =
  | { kind: "text"; key: string; text: string }
  | { kind: "figure"; key: string; figure: DisplayFigure };

function readerRows(paragraphs: string[], figures: DisplayFigure[]): ReaderRow[] {
  const text = paragraphs.map((value, index) => ({ kind: "text" as const, key: `p-${index}`, text: value }));
  const media = figures.map((figure) => ({ kind: "figure" as const, key: figure.id, figure }));
  if (!media.length) return text;
  if (!text.length) return media;
  return [text[0], ...media, ...text.slice(1)];
}
