import { Image } from "expo-image";
import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { searchWikipedia } from "@/infrastructure/learning/wikipedia";
import { ActionButton } from "@/shared/components/action-button";
import { FilterChips } from "@/shared/components/filter-chips";
import { Page } from "@/shared/components/page";
import { ThemedText } from "@/shared/components/themed-text";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { contentSources } from "@/shared/constants/content-sources";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import {
  ReadingError,
  type ReadingErrorCode,
  type WikipediaLanguage,
  type WikipediaResult,
} from "@/shared/types/offline-reading";

const topics: Record<WikipediaLanguage, string[]> = {
  en: ["Science", "History", "Mathematics", "Technology"],
  tl: ["Agham", "Kasaysayan", "Matematika", "Teknolohiya"],
};

export default function LearnPage({ inTab = false }: { inTab?: boolean }) {
  const { t, locale } = useTranslation();
  const colors = useTheme();
  const language: WikipediaLanguage = locale === "fil" ? "tl" : "en";
  const [query, setQuery] = useState(topics[language][0]);
  const [searchRequest, setSearchRequest] = useState<{
    query: string;
    language: WikipediaLanguage;
  } | null>({ query, language });
  const [results, setResults] = useState<WikipediaResult[]>([]);
  const [searching, setSearching] = useState(true);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState<ReadingErrorCode | null>(null);
  const request = useRef<AbortController | null>(null);
  const {
    items,
    hydrated,
    busyId,
    downloading,
    error,
    hydrate,
    download,
    cancel,
    clearError,
  } = useOfflineReadingStore();

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  useEffect(() => {
    if (!searchRequest) return;
    const controller = new AbortController();
    request.current = controller;
    void searchWikipedia(
      searchRequest.query,
      searchRequest.language,
      controller.signal,
    )
      .then((found) => {
        if (!controller.signal.aborted) {
          setResults(found);
          setSearched(true);
        }
      })
      .catch((cause: unknown) => {
        if (!controller.signal.aborted)
          setSearchError(
            cause instanceof ReadingError ? cause.code : "network",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setSearching(false);
      });
    return () => controller.abort();
  }, [searchRequest]);

  function resetSearch() {
    request.current?.abort();
    request.current = null;
    setSearchRequest(null);
    setSearching(false);
    setResults([]);
    setSearched(false);
    setSearchError(null);
  }

  function search(nextQuery = query, nextLanguage = language) {
    if (!nextQuery.trim()) return;
    request.current?.abort();
    setQuery(nextQuery);
    setSearching(true);
    setSearched(false);
    setSearchError(null);
    setResults([]);
    setSearchRequest({ query: nextQuery, language: nextLanguage });
  }

  return (
    <Page
      nested={!inTab}
      title={t("reading.onlineTitle")}
      description={t("reading.onlineDescription")}
    >
      <TextInput
        value={query}
        onChangeText={(value) => {
          resetSearch();
          setQuery(value);
        }}
        placeholder={t("reading.placeholder")}
        accessibilityLabel={t("reading.placeholder")}
        placeholderTextColor={colors.textSecondary}
        maxLength={200}
        autoCorrect={false}
        returnKeyType="search"
        onSubmitEditing={() => search()}
        style={[
          styles.input,
          {
            color: colors.text,
            backgroundColor: colors.backgroundElement,
            borderColor: colors.dashboardBorder,
          },
        ]}
      />
      <ActionButton
        label={searching ? t("reading.searching") : t("reading.search")}
        disabled={!query.trim() || searching}
        onPress={() => search()}
      />
      <FilterChips
        options={topics[language].map((topic) => ({ id: topic, label: topic }))}
        value={searchRequest?.query ?? ""}
        onChange={(topic) => search(topic)}
      />
      <ThemedText type="small" themeColor="textSecondary">
        {t("reading.connectionHint")}
      </ThemedText>
      {searching ? (
        <ActivityIndicator
          color={colors.tint}
          accessibilityLabel={t("reading.searching")}
        />
      ) : null}
      {searchError ? (
        <View style={styles.results}>
          <ThemedText accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${searchError}`)}
          </ThemedText>
          <ActionButton
            label={t("reading.retry")}
            disabled={!query.trim()}
            onPress={() => search()}
          />
        </View>
      ) : null}
      {error ? (
        <View style={styles.results}>
          <ThemedText accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${error}`)}
          </ThemedText>
          <ActionButton
            label={hydrated ? t("common.close") : t("reading.retry")}
            onPress={() => {
              clearError();
              if (!hydrated) void hydrate();
            }}
          />
        </View>
      ) : null}
      {busyId ? (
        <View
          style={[
            styles.notice,
            { backgroundColor: colors.backgroundSelected },
          ]}
        >
          <ThemedText accessibilityLiveRegion="polite">
            {downloading ? t("reading.downloading") : t("reading.saving")}
          </ThemedText>
          {downloading ? (
            <ActionButton label={t("common.cancel")} onPress={cancel} />
          ) : null}
        </View>
      ) : null}
      {searched && !results.length ? (
        <ThemedText>{t("reading.noResults")}</ThemedText>
      ) : null}
      {searched && results.length ? (
        <ThemedText
          type="smallBold"
          themeColor="tint"
          accessibilityLiveRegion="polite"
        >
          {t("reading.onlineResults", { count: results.length })}
        </ThemedText>
      ) : null}
      {results.map((result) => {
        const saved = items.some((item) => item.id === result.id);
        return (
          <View
            key={result.id}
            style={[
              styles.result,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.dashboardBorder,
              },
            ]}
          >
            {result.thumbnailUrl ? (
              <Image
                source={{ uri: result.thumbnailUrl }}
                contentFit="cover"
                accessibilityLabel={result.title}
                style={styles.thumb}
              />
            ) : null}
            <ThemedText type="subtitle">{result.title}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Wikipedia · {result.language === "en" ? "English" : "Tagalog"} ·{" "}
              {t("reading.minutes", {
                count: Math.max(1, Math.ceil(result.wordCount / 220)),
              })}
            </ThemedText>
            {saved ? (
              <ThemedText type="small" themeColor="tint">
                {t("reading.downloaded")}
              </ThemedText>
            ) : null}
            <ActionButton
              label={
                saved
                  ? t("reading.read")
                  : busyId === result.id
                    ? t("reading.downloading")
                    : t("reading.download")
              }
              disabled={!saved && (!!busyId || !hydrated)}
              onPress={() => {
                if (saved)
                  router.push({
                    pathname: "/read/[id]",
                    params: { id: result.id },
                  });
                else void download(result);
              }}
            />
          </View>
        );
      })}
      <ActionButton
        label={t("reading.openLibrary")}
        onPress={() =>
          router.navigate({
            pathname: "/(tabs)/library",
            params: { shelf: "reading" },
          })
        }
      />
      <View
        style={[styles.notice, { backgroundColor: colors.backgroundSelected }]}
      >
        <ThemedText type="smallBold">Wikipedia</ThemedText>
        <ThemedText type="small">{t("reading.illustratedEdition")}</ThemedText>
        {Platform.OS === "web" ? (
          <ThemedText type="small">{t("reading.browserNote")}</ThemedText>
        ) : null}
      </View>
      {contentSources.openStax ? (
        <ActionButton
          label={t("reading.openStax")}
          onPress={() => router.push("/packs")}
        />
      ) : null}
      {inTab ? <View style={styles.tabSpacer} /> : null}
    </Page>
  );
}

const styles = StyleSheet.create({
  tabSpacer: { height: BottomTabInset },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    fontSize: 16,
  },
  notice: { borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
  results: { gap: Spacing.two },
  result: {
    borderWidth: 1,
    borderRadius: 18,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  thumb: { width: "100%", height: 140, borderRadius: 12 },
});
