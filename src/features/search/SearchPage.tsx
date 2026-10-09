import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import type {
  AccessStatus,
  FederatedSearchResult,
  ResourceKind,
  ResourceResult,
} from "@/features/resources";
import {
  providerLabel,
  RESEARCH_PROVIDER_IDS,
  searchResources,
} from "@/features/resources";
import {
  PdfSaveError,
  savedPdfIds,
  saveResourcePdf,
} from "@/features/resources/services/save-resource-pdf";
import { pdfStorageKey } from "@/infrastructure/resources/pdf-record";
import { ActionButton } from "@/shared/components/action-button";
import { FilterChips } from "@/shared/components/filter-chips";
import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import {
  useOnboardingStore,
  type OnboardingTopicId,
} from "@/shared/stores/onboarding-store";

import {
  articleMatchesTopic,
  articles,
  topicLabelKey,
  type CatalogArticle,
  type SearchKind,
} from "./catalog";
import { DownloadFailed } from "./components/DownloadFailed";
import { EmptyResults } from "./components/EmptyResults";
import { PassageResultCard } from "./components/PassageResultCard";
import { ResultCard, type SearchResult } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";
import { downloadSearchPack } from "./download-pack";
import { useLocalSearch } from "./hooks/useLocalSearch";

type FilterId = "all" | SearchKind | OnboardingTopicId;

const kindFilters: FilterId[] = ["all", "article", "document", "pack"];

function isTopic(filter: FilterId): filter is OnboardingTopicId {
  return !kindFilters.includes(filter);
}

const PAGE_SIZE = 8;

type SearchSnapshot = {
  query: string;
  items: ResourceResult[];
  page: FederatedSearchResult | null;
  failed: boolean;
};

const accessKey: Record<AccessStatus, MessageKey> = {
  "open-access": "search.accessOpen",
  restricted: "search.accessRestricted",
  unknown: "search.accessUnknown",
};

export default function SearchPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topics = useOnboardingStore((state) => state.topics);
  const filters: { id: FilterId; label: string }[] = topics.length
    ? topics.map((id) => ({ id, label: t(topicLabelKey[id]) }))
    : [
        { id: "all" as const, label: t("search.all") },
        { id: "article" as const, label: t("search.articles") },
        { id: "document" as const, label: t("search.documents") },
        { id: "pack" as const, label: t("search.packs") },
      ];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>(
    () => useOnboardingStore.getState().topics[0] ?? "all",
  );
  const [submitted, setSubmitted] = useState("");
  const [snapshot, setSnapshot] = useState<SearchSnapshot | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failedPackId, setFailedPackId] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<string[]>([]);
  const [pdfBusyId, setPdfBusyId] = useState<string | null>(null);
  const [pdfError, setPdfError] = useState<{
    id: string;
    message: string;
  } | null>(null);

  useFocusEffect(
    useCallback(() => {
      void savedPdfIds().then(setSavedIds);
    }, []),
  );

  useEffect(() => {
    const handle = setTimeout(() => setSubmitted(query.trim()), 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (submitted.length < 2) return;
    const controller = new AbortController();
    const request = submitted;
    void searchResources(
      { query: request, pageSize: PAGE_SIZE, signal: controller.signal },
      RESEARCH_PROVIDER_IDS,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        setSnapshot({
          query: request,
          items: next.results,
          page: next,
          failed: false,
        });
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSnapshot({ query: request, items: [], page: null, failed: true });
        }
      });
    return () => controller.abort();
  }, [submitted]);

  const current = snapshot?.query === submitted ? snapshot : null;
  const page = current?.page ?? null;
  const failed = current?.failed ?? false;
  const loading = submitted.length >= 2 && current === null;

  async function loadMore() {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await searchResources(
        { query: submitted, pageSize: PAGE_SIZE, cursor: page.nextCursor },
        RESEARCH_PROVIDER_IDS,
      );
      setSnapshot((existing) => {
        if (!existing || existing.query !== submitted) return existing;
        const seen = new Set(existing.items.map((item) => item.id));
        return {
          query: submitted,
          page: next,
          failed: false,
          items: [
            ...existing.items,
            ...next.results.filter((item) => !seen.has(item.id)),
          ],
        };
      });
    } catch {
      setSnapshot((existing) =>
        existing && existing.query === submitted
          ? { ...existing, failed: true }
          : existing,
      );
    } finally {
      setLoadingMore(false);
    }
  }

  const activeFilter: FilterId = topics.length
    ? topics.includes(filter as OnboardingTopicId)
      ? filter
      : topics[0]
    : isTopic(filter)
      ? "all"
      : filter;

  const library = useLocalSearch(query);
  const passages =
    topics.length > 0 || activeFilter === "all" || activeFilter === "article"
      ? library.hits
      : [];

  const catalog = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      if (topics.length > 0) {
        const topic = isTopic(activeFilter) ? activeFilter : topics[0];
        if (!articleMatchesTopic(article, topic)) return false;
      } else if (activeFilter !== "all" && article.kind !== activeFilter) {
        return false;
      }
      if (!needle) return true;
      const haystack =
        `${article.title} ${article.pack} ${article.summary} ${article.tags}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [activeFilter, query, topics]);

  const resourceItems = useMemo(() => {
    const items = snapshot?.query === submitted ? snapshot.items : [];
    return items.filter((item) => matchesFilter(item, activeFilter));
  }, [activeFilter, snapshot, submitted]);

  const offline = page?.networkUnavailable ?? false;
  const partial =
    page?.providers.some((status) => status.state === "error") ?? false;
  const resources = resourceItems.map((item) =>
    toCard(
      item,
      t,
      downloadState(item, savedIds, pdfBusyId, pdfError, openResourcePdf),
    ),
  );
  const total = passages.length + catalog.length + resources.length;
  const countLabel =
    total === 1
      ? t(offline ? "search.oneResult" : "search.aboutOne")
      : t(offline ? "search.manyResults" : "search.aboutResults", {
          count: total,
        });
  const message = failed
    ? t("search.resourcesFailed")
    : offline
      ? t("search.resourcesOffline")
      : null;
  const noResults =
    query.trim().length > 0 &&
    total === 0 &&
    !loading &&
    (!library.pending || library.error !== null || !library.ready);

  function attemptDownload(article: CatalogArticle) {
    const result = downloadSearchPack(article.id);
    setFailedPackId(result.ok ? null : article.id);
  }

  async function openResourcePdf(
    item: { id: string; title: string },
    url: string,
    openLinkOnFailure = false,
  ) {
    if (openLinkOnFailure && Platform.OS === "web") {
      await Linking.openURL(url);
      return;
    }
    const storageId = pdfStorageKey(item.id);
    if (savedIds.includes(storageId)) {
      router.push({ pathname: "/pdf/[id]", params: { id: storageId } });
      return;
    }
    setPdfBusyId(item.id);
    setPdfError(null);
    try {
      await saveResourcePdf({ resourceId: item.id, title: item.title, url });
      setSavedIds((current) =>
        current.includes(storageId) ? current : [...current, storageId],
      );
      router.push({ pathname: "/pdf/[id]", params: { id: storageId } });
    } catch (error) {
      const code = error instanceof PdfSaveError ? error.code : "network";
      if (openLinkOnFailure && (code === "network" || code === "too-large")) {
        await Linking.openURL(url);
        return;
      }
      const key =
        code === "not-pdf"
          ? "search.pdfFailedType"
          : code === "too-large"
            ? "search.pdfFailedSize"
            : code === "storage"
              ? "search.pdfFailedStorage"
              : "search.pdfFailedNetwork";
      setPdfError({ id: item.id, message: t(key) });
    } finally {
      setPdfBusyId(null);
    }
  }

  if (failedPackId) {
    return (
      <DownloadFailed
        onBack={() => setFailedPackId(null)}
        onCancel={() => setFailedPackId(null)}
        onRetry={() => {
          if (downloadSearchPack(failedPackId).ok) setFailedPackId(null);
        }}
      />
    );
  }

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      {noResults ? <LeafDecor width={130} /> : null}
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: insets.top + Spacing.two,
            paddingBottom: BottomTabInset + Spacing.four,
          },
        ]}
      >
        {noResults ? null : <SearchBrandHeader />}
        <View style={noResults ? styles.fieldRow : undefined}>
          {noResults ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.goBack")}
              onPress={() => setQuery("")}
              style={styles.back}
            >
              <SymbolView
                name={{
                  ios: "chevron.left",
                  android: "arrow_back",
                  web: "arrow_back",
                }}
                size={22}
                tintColor={colors.text}
              />
            </Pressable>
          ) : null}
          <View
            style={[
              styles.field,
              noResults ? styles.fieldInRow : null,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.dashboardBorder,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: "magnifyingglass",
                android: "search",
                web: "search",
              }}
              size={20}
              tintColor={colors.textSecondary}
            />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder={t("home.searchPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={t("home.searchLibrary")}
              autoCorrect={false}
              returnKeyType="search"
              style={[styles.input, { color: colors.text }]}
            />
            {query.length > 0 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={t("search.clear")}
                onPress={() => setQuery("")}
                style={styles.clear}
              >
                <SymbolView
                  name={{ ios: "xmark", android: "close", web: "close" }}
                  size={16}
                  tintColor={colors.textSecondary}
                />
              </Pressable>
            ) : null}
          </View>
        </View>
        {noResults ? null : (
          <>
            <FilterChips
              options={filters}
              value={activeFilter}
              onChange={setFilter}
            />
            {query.trim().length > 0 || total > 0 ? (
              <View style={styles.countRow}>
                {offline ? (
                  <SymbolView
                    name={{
                      ios: "wifi.slash",
                      android: "wifi_off",
                      web: "wifi_off",
                    }}
                    size={16}
                    tintColor={colors.tint}
                  />
                ) : null}
                <ThemedText
                  type="smallBold"
                  style={{ color: colors.tint }}
                  accessibilityLiveRegion="polite"
                >
                  {countLabel}
                  {partial ? ` · ${t("search.resourcesPartial")}` : ""}
                </ThemedText>
                {loading ? (
                  <ActivityIndicator
                    color={colors.tint}
                    accessibilityLabel={t("search.resourcesSearching")}
                  />
                ) : null}
              </View>
            ) : null}
          </>
        )}
        {message ? (
          <ThemedText
            accessibilityRole="alert"
            style={[styles.empty, { color: colors.error }]}
          >
            {message}
          </ThemedText>
        ) : null}
        {library.error && !noResults ? (
          <ThemedText
            themeColor="error"
            accessibilityRole="alert"
            style={styles.empty}
          >
            {library.error}
          </ThemedText>
        ) : null}
        <View style={styles.list}>
          {noResults ? <EmptyResults query={query.trim()} /> : null}
          {passages.map((hit) => (
            <PassageResultCard key={hit.chunkId} hit={hit} />
          ))}
          {catalog.map((article) => (
            <ResultCard
              key={article.id}
              result={toCatalogCard(
                article,
                attemptDownload,
                catalogDownload(
                  article,
                  savedIds,
                  pdfBusyId,
                  pdfError,
                  (item, url) => void openResourcePdf(item, url, true),
                ),
              )}
            />
          ))}
          {resources.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </View>
        {page?.nextCursor && !loading ? (
          <View style={styles.more}>
            <ActionButton
              label={
                loadingMore
                  ? t("search.resourcesSearching")
                  : t("search.resourcesMore")
              }
              disabled={loadingMore}
              onPress={() => void loadMore()}
            />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function matchesFilter(item: ResourceResult, filter: FilterId) {
  if (filter === "all" || isTopic(filter)) return true;
  if (filter === "pack") return false;
  if (filter === "document")
    return item.kind === "book" || item.kind === "report";
  return isArticleKind(item.kind);
}

function isArticleKind(kind: ResourceKind) {
  return (
    kind === "article" ||
    kind === "encyclopedia" ||
    kind === "research-paper" ||
    kind === "preprint"
  );
}

function downloadableUrl(item: ResourceResult): string | undefined {
  if (item.canDownload !== true) return undefined;
  return item.pdfUrl ?? item.fileUrl;
}

function downloadState(
  item: ResourceResult,
  savedIds: readonly string[],
  busyId: string | null,
  error: { id: string; message: string } | null,
  onSave: (item: ResourceResult, url: string) => void,
): SearchResult["download"] {
  const url = downloadableUrl(item);
  if (!url) return undefined;
  return {
    saved: savedIds.includes(pdfStorageKey(item.id)),
    busy: busyId === item.id,
    error: error?.id === item.id ? error.message : null,
    onPress: () => onSave(item, url),
  };
}

function toCard(
  item: ResourceResult,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  download?: SearchResult["download"],
): SearchResult {
  const document = item.kind === "book" || item.kind === "report";
  const source = [
    item.provenance ?? providerLabel(item.provider),
    ...(item.alsoFoundAt ?? []).map(providerLabel),
  ]
    .filter(Boolean)
    .join(" · ");
  const authors = item.authors.slice(0, 3).join(", ");
  return {
    id: item.id,
    title: item.title,
    pack: source,
    kind: document ? "document" : "article",
    readMinutes: 1,
    summary: item.description || authors,
    sourceLabel: t("search.fromPack", { pack: source }),
    metaLabel: `${t(document ? "search.document" : "search.article")} · ${t(accessKey[item.accessStatus])}`,
    download,
    onPress: () => {
      void Linking.openURL(item.sourceUrl);
    },
  };
}

function catalogDownload(
  article: CatalogArticle,
  savedIds: readonly string[],
  busyId: string | null,
  error: { id: string; message: string } | null,
  onSave: (item: { id: string; title: string }, url: string) => void,
): SearchResult["download"] {
  if (!article.pdfUrl) return undefined;
  return {
    saved: savedIds.includes(pdfStorageKey(article.id)),
    busy: busyId === article.id,
    error: error?.id === article.id ? error.message : null,
    onPress: () => onSave(article, article.pdfUrl ?? ""),
  };
}

function toCatalogCard(
  article: CatalogArticle,
  onPackPress: (article: CatalogArticle) => void,
  download?: SearchResult["download"],
): SearchResult {
  return {
    id: article.id,
    title: article.title,
    pack: article.pack,
    kind: article.kind,
    readMinutes: article.readMinutes,
    summary: article.summary,
    image: article.image,
    download,
    onPress: () => {
      if (article.kind === "pack") {
        onPackPress(article);
        return;
      }
      router.push(`/article/${article.id}`);
    },
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.three,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.three,
    gap: 4,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    marginHorizontal: Spacing.three,
    paddingHorizontal: Spacing.three,
    borderRadius: 26,
    borderWidth: 1,
  },
  fieldInRow: { flex: 1, marginLeft: 0, marginRight: 0 },
  input: { flex: 1, fontSize: 16, minHeight: 48 },
  clear: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  countRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: Spacing.three,
  },
  list: { gap: 12 },
  empty: { paddingHorizontal: Spacing.three },
  more: { paddingHorizontal: Spacing.three },
});
