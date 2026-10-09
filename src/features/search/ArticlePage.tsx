import { Image } from "expo-image";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, Share, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { contentSources } from "@/shared/constants/content-sources";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";

import { articleById, type SearchKind } from "./catalog";

const kindKey: Record<SearchKind, MessageKey> = {
  article: "search.article",
  document: "search.document",
  pack: "search.pack",
};

export default function ArticlePage() {
  return contentSources.openStax ? <OpenStaxArticlePage /> : <Redirect href="/learn" />;
}

function OpenStaxArticlePage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = articleById(typeof id === "string" ? id : "");
  const [saved, setSaved] = useState(false);
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);

  if (!article) {
    return (
      <ThemedView style={[styles.missing, { paddingTop: insets.top + Spacing.four }]}>
        <ThemedText type="subtitle">{t("article.notFound")}</ThemedText>
        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <ThemedText type="smallBold" style={{ color: colors.tint }}>
            {t("article.backToSearch")}
          </ThemedText>
        </Pressable>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.two, paddingBottom: insets.bottom + 96 },
        ]}
      >
        <View style={styles.toolbar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t("common.goBack")}
            onPress={() => router.back()}
            style={styles.iconButton}
          >
            <SymbolView
              name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
              size={22}
              tintColor={colors.text}
            />
          </Pressable>
          <View style={styles.toolbarActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={saved ? t("article.removeBookmark") : t("article.bookmark")}
              accessibilityState={{ selected: saved }}
              onPress={() => setSaved((value) => !value)}
              style={styles.iconButton}
            >
              <SymbolView
                name={{
                  ios: saved ? "bookmark.fill" : "bookmark",
                  android: saved ? "bookmark" : "bookmark_border",
                  web: saved ? "bookmark" : "bookmark_border",
                }}
                size={22}
                tintColor={colors.tint}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("article.share")}
              onPress={() => {
                void Share.share({ message: `${article.title}\n\n${article.overview}` });
              }}
              style={styles.iconButton}
            >
              <SymbolView
                name={{ ios: "square.and.arrow.up", android: "share", web: "share" }}
                size={22}
                tintColor={colors.text}
              />
            </Pressable>
          </View>
        </View>

        <Image source={article.image} contentFit="cover" style={styles.hero} accessibilityLabel="" />

        <View style={styles.body}>
          <ThemedText type="subtitle" accessibilityRole="header">
            {article.title}
          </ThemedText>
          <View style={[styles.packChip, { backgroundColor: colors.backgroundSelected }]}>
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              {article.pack}
            </ThemedText>
          </View>
          <ThemedText type="small" themeColor="textSecondary">
            {t("article.offlineMeta", {
              kind: t(kindKey[article.kind]),
              minutes: article.readMinutes,
            })}
          </ThemedText>

          <ThemedText type="smallBold" accessibilityRole="header" style={styles.section}>
            {t("article.overview")}
          </ThemedText>
          <ThemedText>{article.overview}</ThemedText>

          <View style={[styles.callout, { backgroundColor: colors.backgroundSelected }]}>
            <SymbolView
              name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
              size={18}
              tintColor={colors.tint}
            />
            <ThemedText type="small" style={styles.calloutText}>
              {article.highlight}
            </ThemedText>
          </View>

          <ThemedText type="smallBold" accessibilityRole="header" style={styles.section}>
            {article.sectionTitle}
          </ThemedText>
          {article.subsectionTitle ? (
            <ThemedText type="smallBold" style={{ color: colors.tint }}>
              {article.subsectionTitle}
            </ThemedText>
          ) : null}
          <ThemedText>{article.sectionBody}</ThemedText>
        </View>
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three, backgroundColor: colors.background }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("article.askAi")}
          onPress={() => openAssistant({ articleTitle: article.title })}
          style={({ pressed }) => [
            styles.ask,
            { backgroundColor: pressed ? colors.tintPressed : colors.tint },
          ]}
        >
          <SymbolView
            name={{ ios: "sparkles", android: "auto_awesome", web: "auto_awesome" }}
            size={18}
            tintColor={colors.backgroundElement}
          />
          <ThemedText type="smallBold" style={{ color: colors.backgroundElement }}>
            {t("article.askAi")}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  missing: { flex: 1, paddingHorizontal: Spacing.four, gap: Spacing.three },
  scroll: { width: "100%", maxWidth: 600, alignSelf: "center" },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.two,
  },
  toolbarActions: { flexDirection: "row" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  hero: { height: 220, marginHorizontal: Spacing.three, borderRadius: 20 },
  body: { padding: Spacing.three, gap: Spacing.two },
  packChip: { alignSelf: "flex-start", borderRadius: 14, paddingHorizontal: 12, paddingVertical: 6 },
  section: { marginTop: Spacing.two },
  callout: { flexDirection: "row", gap: 10, borderRadius: 16, padding: Spacing.three, alignItems: "flex-start" },
  calloutText: { flex: 1 },
  footer: { paddingHorizontal: Spacing.three, paddingTop: Spacing.two },
  ask: {
    minHeight: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
});
