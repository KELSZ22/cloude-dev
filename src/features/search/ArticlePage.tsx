import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { FlatList, Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ActionButton } from "@/shared/components/action-button";
import { ExternalLink } from "@/shared/components/external-link";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import { useSavedCatalogStore } from "@/shared/stores/saved-catalog-store";

import { articleById, catalogSections } from "./catalog";

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
  const saveCatalog = useSavedCatalogStore((state) => state.save);
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);
  const [sectionIndex, setSectionIndex] = useState(0);
  const [contentsOpen, setContentsOpen] = useState(false);
  const [largeText, setLargeText] = useState(false);

  useEffect(() => {
    if (!article || article.kind === "pack") return;
    saveCatalog({
      id: article.id,
      title: article.title,
      pack: article.pack,
      summary: article.summary,
      readMinutes: article.readMinutes,
    });
  }, [article, saveCatalog]);

  if (!article || article.kind === "pack") {
    return (
      <ThemedView style={styles.missing}>
        <ThemedText accessibilityRole="alert">{t("article.notFound")}</ThemedText>
        <ActionButton label={t("article.backToSearch")} onPress={() => router.back()} />
      </ThemedView>
    );
  }

  const sections = catalogSections(article);
  const section = sections[sectionIndex] ?? sections[0];
  const words = sections.reduce(
    (total, entry) => total + entry.paragraphs.join(" ").split(/\s+/).filter(Boolean).length,
    0,
  );
  const minutes = Math.max(1, Math.ceil(words / 220));
  const studied = sections.length > 1;
  const sectionTitle = section.title || t("reading.introduction");
  const sourcePage = httpsPage(article.sourcePage);

  function changeSection(index: number) {
    setSectionIndex(index);
    setContentsOpen(false);
  }

  return (
    <ThemedView style={[styles.screen, { backgroundColor: colors.backgroundWarm }]}>
      <FlatList
        key={`${article.id}-${sectionIndex}`}
        data={section.paragraphs}
        keyExtractor={(_item, index) => `${sectionIndex}-${index}`}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + Spacing.four }]}
        ListHeaderComponent={
          <View style={styles.header}>
            <Pressable accessibilityRole="button" accessibilityLabel={t("common.goBack")} onPress={() => router.back()} style={styles.back}>
              <ThemedText type="smallBold" themeColor="tint">{t("common.back")}</ThemedText>
            </Pressable>
            <ThemedText type="smallBold" themeColor="tint">
              {studied ? t("article.studyEdition") : t("reading.available")}
            </ThemedText>
            <ThemedText type="title" accessibilityRole="header">{article.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {article.pack} · {t("reading.minutes", { count: minutes })}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("article.askAi")}
              onPress={() =>
                openAssistant({
                  articleTitle: article.title,
                  pageText: sections
                    .map((entry) => [entry.title, ...entry.paragraphs].filter(Boolean).join("\n"))
                    .join("\n\n"),
                })
              }
              style={[styles.ask, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}
            >
              <ThemedText type="smallBold">{t("article.askAi")}</ThemedText>
            </Pressable>
            <View style={styles.toolbar}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: contentsOpen }}
                onPress={() => setContentsOpen((value) => !value)}
                style={styles.tool}
              >
                <ThemedText type="smallBold" themeColor="tint">{t("reading.contents")}</ThemedText>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ selected: largeText }}
                onPress={() => setLargeText((value) => !value)}
                style={styles.tool}
              >
                <ThemedText type="smallBold" themeColor="tint">
                  {largeText ? t("reading.normalText") : t("reading.largeText")}
                </ThemedText>
              </Pressable>
            </View>
            {contentsOpen ? (
              <View style={[styles.contents, { backgroundColor: colors.backgroundElement }]}>
                {sections.map((entry, index) => (
                  <Pressable
                    key={`${entry.title}-${index}`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: index === sectionIndex }}
                    onPress={() => changeSection(index)}
                    style={[styles.chapter, { paddingLeft: Spacing.three + Math.max(0, entry.level - 1) * 10 }]}
                  >
                    <ThemedText type="small" themeColor={index === sectionIndex ? "tint" : "text"}>
                      {index + 1}. {entry.title || t("reading.introduction")}
                    </ThemedText>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <ThemedText type="small" themeColor="textSecondary">
              {t("reading.sectionProgress", { current: sectionIndex + 1, total: sections.length })}
            </ThemedText>
            <ThemedText type="subtitle" accessibilityRole="header">{sectionTitle}</ThemedText>
          </View>
        }
        renderItem={({ item }) => (
          <ThemedText selectable style={[styles.paragraph, largeText && styles.largeParagraph]}>{item}</ThemedText>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            {sectionIndex > 0 ? <ActionButton label={t("reading.previous")} onPress={() => changeSection(sectionIndex - 1)} /> : null}
            {sectionIndex < sections.length - 1 ? <ActionButton label={t("reading.next")} onPress={() => changeSection(sectionIndex + 1)} /> : null}
            <View style={[styles.attribution, { borderColor: colors.border }]}>
              <ThemedText type="smallBold">{t("reading.sourceTitle")}</ThemedText>
              {studied ? <ThemedText type="small" themeColor="textSecondary">{t("article.studyCredit")}</ThemedText> : null}
              {article.licenseName ? <ThemedText type="small" themeColor="textSecondary">{article.licenseName}</ThemedText> : null}
              {sourcePage ? (
                <ExternalLink href={sourcePage}>
                  <ThemedText type="link" themeColor="tint">{sourcePage}</ThemedText>
                </ExternalLink>
              ) : null}
            </View>
          </View>
        }
      />
    </ThemedView>
  );
}

function httpsPage(value: string | null | undefined): `https://${string}` | null {
  if (typeof value === "string" && value.startsWith("https://")) return value as `https://${string}`;
  return null;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, justifyContent: "center", padding: Spacing.four, gap: Spacing.three },
  content: { padding: Spacing.four, width: "100%", maxWidth: 680, alignSelf: "center" },
  header: { gap: Spacing.two, marginBottom: Spacing.four },
  back: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  ask: { minHeight: 48, justifyContent: "center", borderWidth: 1, borderRadius: 16, paddingHorizontal: Spacing.three },
  toolbar: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", gap: Spacing.two },
  tool: { minHeight: 48, justifyContent: "center", paddingHorizontal: Spacing.two },
  contents: { borderRadius: 16, paddingVertical: Spacing.two },
  chapter: { minHeight: 44, justifyContent: "center", paddingVertical: Spacing.two, paddingRight: Spacing.three },
  paragraph: { fontSize: 18, lineHeight: 30, marginBottom: Spacing.three },
  largeParagraph: { fontSize: 22, lineHeight: 36 },
  footer: { gap: Spacing.three, marginTop: Spacing.three },
  attribution: { borderTopWidth: 1, paddingTop: Spacing.four, gap: Spacing.two, marginTop: Spacing.three },
});
