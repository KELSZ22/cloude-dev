import { router, useFocusEffect } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { randomWikipedia, searchWikipedia, searchWikipediaPage } from "@/infrastructure/learning/wikipedia";
import { ActionButton } from "@/shared/components/action-button";
import { FilterChips } from "@/shared/components/filter-chips";
import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import {
  ONBOARDING_TOPIC_IDS,
  useOnboardingStore,
  type OnboardingTopicId,
} from "@/shared/stores/onboarding-store";
import {
  ReadingError,
  READING_WORDS_PER_MINUTE,
  type ReadingErrorCode,
  type WikipediaResult,
} from "@/shared/types/offline-reading";

import { topicQuery } from "@/shared/constants/topic-queries";
import { topicLabelKey } from "./catalog";
import { EmptyResults } from "./components/EmptyResults";
import { ResultCard, type SearchResult } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";

type FilterId = "all" | OnboardingTopicId | `custom:${string}`;

function customFilterId(label: string): FilterId {
  return `custom:${label}`;
}

const TOPIC_PAGE_SIZE = 20;

type WikiSnapshot = {
  query: string;
  items: WikipediaResult[];
  error: ReadingErrorCode | null;
};

const readingErrorKey: Record<ReadingErrorCode, MessageKey> = {
  network: "reading.errors.network",
  unavailable: "reading.errors.unavailable",
  tooLarge: "reading.errors.tooLarge",
  storage: "reading.errors.storage",
  cancelled: "reading.errors.cancelled",
};

export default function SearchPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const selectedTopics = useOnboardingStore((state) => state.topics);
  const customTopics = useOnboardingStore((state) => state.customTopics);
  const toggleTopic = useOnboardingStore((state) => state.toggleTopic);
  const addCustomTopic = useOnboardingStore((state) => state.addCustomTopic);
  const topicsReady = useOnboardingStore((state) => state.hasHydrated);
  const [topicPickerOpen, setTopicPickerOpen] = useState(false);
  const topicPickerOpenedAt = useRef(0);
  const [draftTopic, setDraftTopic] = useState("");
  const availableTopics = ONBOARDING_TOPIC_IDS.filter((id) => !selectedTopics.includes(id));
  const filters: { id: FilterId; label: string }[] = [
    { id: "all", label: t("search.all") },
    ...ONBOARDING_TOPIC_IDS
      .filter((id) => selectedTopics.includes(id))
      .map((id) => ({ id, label: t(topicLabelKey[id]) })),
    ...customTopics.map((label) => ({ id: customFilterId(label), label })),
  ];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const active: FilterId = filters.some((item) => item.id === filter) ? filter : "all";
  const [submitted, setSubmitted] = useState("");
  const [wiki, setWiki] = useState<WikiSnapshot | null>(null);
  const [topicFeed, setTopicFeed] = useState<(WikiSnapshot & { id: FilterId; nextOffset: number | null }) | null>(null);
  const [topicLoading, setTopicLoading] = useState(false);
  const [topicLoadingMore, setTopicLoadingMore] = useState(false);
  const topicMore = useRef<AbortController | null>(null);
  const [wikiErrorId, setWikiErrorId] = useState<string | null>(null);
  const [featured, setFeatured] = useState<WikipediaResult[]>([]);
  const [featuredError, setFeaturedError] = useState<ReadingErrorCode | null>(null);
  const [featuredLoading, setFeaturedLoading] = useState(true);
  const savedArticles = useOfflineReadingStore((state) => state.items);
  const readingBusyId = useOfflineReadingStore((state) => state.busyId);
  const readingError = useOfflineReadingStore((state) => state.error);
  const hydrateReading = useOfflineReadingStore((state) => state.hydrate);
  const downloadArticle = useOfflineReadingStore((state) => state.download);
  const clearReadingError = useOfflineReadingStore((state) => state.clearError);

  useFocusEffect(
    useCallback(() => {
      void hydrateReading();
    }, [hydrateReading]),
  );

  useEffect(() => {
    const handle = setTimeout(() => setSubmitted(query.trim()), 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (!topicsReady) return;
    const controller = new AbortController();
    setFeaturedLoading(true);
    const topics = ONBOARDING_TOPIC_IDS.filter((id) => selectedTopics.includes(id));
    const interests = [...topics.map((id) => topicQuery[id]), ...customTopics];
    const perTopic = Math.max(4, Math.ceil(20 / Math.max(interests.length, 1)));
    const load = interests.length
      ? Promise.all(
          interests.map((request) =>
            searchWikipedia(request, "en", controller.signal, undefined, perTopic).catch(
              (cause: unknown) => {
                if (cause instanceof ReadingError && cause.code === "cancelled") throw cause;
                return [] as WikipediaResult[];
              },
            ),
          ),
        ).then((groups) => shuffleArticles(groups.flat()))
      : randomWikipedia("en", controller.signal);
    void load
      .then((items) => {
        if (controller.signal.aborted) return;
        setFeatured(items);
        setFeaturedError(items.length ? null : "unavailable");
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setFeatured([]);
        setFeaturedError(cause instanceof ReadingError ? cause.code : "network");
      })
      .finally(() => {
        if (!controller.signal.aborted) setFeaturedLoading(false);
      });
    return () => controller.abort();
  }, [topicsReady, selectedTopics, customTopics]);

  useEffect(() => {
    if (submitted.length < 2) return;
    const controller = new AbortController();
    const request = submitted;
    void searchWikipedia(request, "en", controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) setWiki({ query: request, items, error: null });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setWiki({
          query: request,
          items: [],
          error: cause instanceof ReadingError ? cause.code : "network",
        });
      });
    return () => controller.abort();
  }, [submitted]);

  useEffect(() => {
    if (active === "all" || submitted.length >= 2) return;
    topicMore.current?.abort();
    const controller = new AbortController();
    const id = active;
    const request = id.startsWith("custom:") ? id.slice("custom:".length) : topicQuery[id as OnboardingTopicId];
    setTopicLoading(true);
    setTopicLoadingMore(false);
    void searchWikipediaPage(request, "en", controller.signal, undefined, TOPIC_PAGE_SIZE, 0)
      .then((page) => {
        if (controller.signal.aborted) return;
        setTopicFeed({
          id,
          query: request,
          items: page.items,
          nextOffset: page.nextOffset,
          error: page.items.length ? null : "unavailable",
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        setTopicFeed({
          id,
          query: request,
          items: [],
          nextOffset: null,
          error: cause instanceof ReadingError ? cause.code : "network",
        });
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopicLoading(false);
      });
    return () => controller.abort();
  }, [active, submitted]);

  const browsing = active === "all" && submitted.length < 2;
  const topicBrowsing = active !== "all" && submitted.length < 2;
  const topicReady = topicFeed?.id === active ? topicFeed : null;
  const loading =
    (browsing && featuredLoading) ||
    (topicBrowsing && (topicLoading || topicReady === null)) ||
    (!browsing && !topicBrowsing && wiki?.query !== submitted);

  const wikiItems = browsing
    ? featured
    : topicBrowsing
      ? (topicReady?.items ?? [])
      : wiki?.query === submitted
        ? wiki.items
        : [];
  const wikipedia = wikiItems.map((item) =>
    toWikipediaCard(
      item,
      t,
      savedArticles,
      readingBusyId,
      readingError,
      wikiErrorId,
      openWikipedia,
      true,
    ),
  );
  const total = wikipedia.length;
  const countLabel =
    total === 1
      ? t("search.aboutOne")
      : t("search.aboutResults", { count: total });
  const noResults = query.trim().length > 0 && total === 0 && !loading;

  function loadMoreTopics() {
    if (active === "all" || !topicFeed || topicFeed.id !== active || topicFeed.nextOffset == null || topicLoadingMore) return;
    topicMore.current?.abort();
    const controller = new AbortController();
    topicMore.current = controller;
    const id = topicFeed.id;
    const request = topicFeed.query;
    const offset = topicFeed.nextOffset;
    setTopicLoadingMore(true);
    void searchWikipediaPage(request, "en", controller.signal, undefined, TOPIC_PAGE_SIZE, offset)
      .then((page) => {
        if (controller.signal.aborted) return;
        setTopicFeed((current) => {
          if (!current || current.id !== id) return current;
          const seen = new Set(current.items.map((item) => item.id));
          return {
            ...current,
            items: [...current.items, ...page.items.filter((item) => !seen.has(item.id))],
            nextOffset: page.nextOffset,
            error: null,
          };
        });
      })
      .catch((cause: unknown) => {
        if (controller.signal.aborted) return;
        const code = cause instanceof ReadingError ? cause.code : "network";
        setTopicFeed((current) => current && current.id === id ? { ...current, error: code } : current);
      })
      .finally(() => {
        if (!controller.signal.aborted) setTopicLoadingMore(false);
      });
  }

  function openWikipedia(result: WikipediaResult) {
    if (savedArticles.some((item) => item.id === result.id)) {
      router.push({ pathname: "/read/[id]", params: { id: result.id } });
      return;
    }
    if (readingBusyId) return;
    setWikiErrorId(result.id);
    clearReadingError();
    void downloadArticle(result);
  }

  function closeTopicPicker() {
    setTopicPickerOpen(false);
    setDraftTopic("");
  }

  function openTopicPicker() {
    topicPickerOpenedAt.current = Date.now();
    setTopicPickerOpen(true);
  }

  function commitTopic(raw = draftTopic) {
    const label = raw.trim().replace(/\s+/g, " ").slice(0, 40);
    if (label.length < 2) return;
    const preset = ONBOARDING_TOPIC_IDS.find(
      (id) => t(topicLabelKey[id]).toLowerCase() === label.toLowerCase(),
    );
    if (preset) {
      if (!selectedTopics.includes(preset)) toggleTopic(preset);
      setFilter(preset);
    } else {
      const saved = addCustomTopic(label);
      if (saved) setFilter(customFilterId(saved));
    }
    closeTopicPicker();
  }

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      <Modal
        visible={topicPickerOpen}
        transparent
        animationType="fade"
        onRequestClose={closeTopicPicker}
      >
        <Pressable
          style={styles.overlay}
          onPress={() => {
            if (Date.now() - topicPickerOpenedAt.current < 400) return;
            closeTopicPicker();
          }}
        >
          <Pressable
            onPress={() => undefined}
            style={[styles.sheet, { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder }]}
          >
            <ThemedText type="smallBold">{t("search.addTopic")}</ThemedText>
            <TextInput
              value={draftTopic}
              onChangeText={setDraftTopic}
              placeholder={t("search.topicPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              accessibilityLabel={t("search.addTopic")}
              autoFocus
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => commitTopic()}
              style={[
                styles.topicField,
                {
                  color: colors.text,
                  borderColor: colors.dashboardBorder,
                  backgroundColor: colors.background,
                },
              ]}
            />
            {availableTopics.map((id) => (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityLabel={t(topicLabelKey[id])}
                onPress={() => {
                  toggleTopic(id);
                  setFilter(id);
                  closeTopicPicker();
                }}
                style={styles.topicOption}
              >
                <ThemedText>{t(topicLabelKey[id])}</ThemedText>
              </Pressable>
            ))}
          </Pressable>
        </Pressable>
      </Modal>
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
              value={active}
              onChange={setFilter}
              trailing={(
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={t("search.addTopic")}
                  onPress={openTopicPicker}
                  style={[styles.addTopic, { borderColor: colors.dashboardBorder, backgroundColor: colors.backgroundElement }]}
                >
                  <SymbolView
                    name={{ ios: "plus", android: "add", web: "add" }}
                    size={18}
                    tintColor={colors.tint}
                  />
                </Pressable>
              )}
            />
            {query.trim().length > 0 && (total > 0 || loading) ? (
              <View style={styles.countRow}>
                <ThemedText
                  type="smallBold"
                  style={{ color: colors.tint }}
                  accessibilityLiveRegion="polite"
                >
                  {countLabel}
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
        {(browsing && featuredLoading) || (topicBrowsing && topicLoading) ? (
          <ActivityIndicator
            color={colors.tint}
            accessibilityLabel={t("search.resourcesSearching")}
          />
        ) : null}
        {browsing && featuredError ? (
          <ThemedText accessibilityRole="alert" style={[styles.empty, { color: colors.error }]}>
            {t(readingErrorKey[featuredError])}
          </ThemedText>
        ) : null}
        {topicBrowsing && topicReady?.error ? (
          <ThemedText accessibilityRole="alert" style={[styles.empty, { color: colors.error }]}>
            {t(readingErrorKey[topicReady.error])}
          </ThemedText>
        ) : null}
        {!browsing && !topicBrowsing && wiki?.query === submitted && wiki.error ? (
          <ThemedText accessibilityRole="alert" style={[styles.empty, { color: colors.error }]}>
            {t(readingErrorKey[wiki.error])}
          </ThemedText>
        ) : null}
        <View style={styles.list}>
          {noResults ? <EmptyResults query={query.trim()} /> : null}
          {wikipedia.map((result) => (
            <ResultCard key={result.id} result={result} />
          ))}
        </View>
        {topicBrowsing && topicReady?.nextOffset != null ? (
          <View style={styles.more}>
            <ActionButton
              label={t("search.loadMore")}
              disabled={topicLoadingMore}
              onPress={loadMoreTopics}
            />
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

function shuffleArticles(items: WikipediaResult[]): WikipediaResult[] {
  const unique = new Map<string, WikipediaResult>();
  for (const item of items) unique.set(item.id, item);
  const next = [...unique.values()];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    const current = next[index];
    next[index] = next[swap];
    next[swap] = current;
  }
  return next;
}

function toWikipediaCard(
  item: WikipediaResult,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
  saved: readonly { id: string; figureCount: number }[],
  busyId: string | null,
  saveError: ReadingErrorCode | null,
  errorId: string | null,
  onOpen: (item: WikipediaResult) => void,
  unnamed = false,
): SearchResult {
  const stored = saved.find((entry) => entry.id === item.id);
  const minutes = Math.max(1, Math.round(item.wordCount / READING_WORDS_PER_MINUTE));
  return {
    id: item.id,
    title: item.title,
    pack: unnamed ? "" : "Wikipedia",
    kind: "article",
    readMinutes: minutes,
    summary: stored?.figureCount
      ? t("reading.figures", { count: stored.figureCount })
      : "",
    image: item.thumbnailUrl ? { uri: item.thumbnailUrl } : undefined,
    sourceLabel: unnamed ? "" : "Wikipedia",
    metaLabel: unnamed
      ? t("search.readMeta", { kind: t("search.article"), minutes })
      : `English · ${t("reading.minutes", { count: minutes })}`,
    download: {
      saved: Boolean(stored),
      busy: busyId === item.id,
      error: errorId === item.id && saveError ? t(readingErrorKey[saveError]) : null,
      idleLabel: t("search.save"),
      savedLabel: t("search.readSaved"),
      busyLabel: t("reading.downloading"),
      onPress: () => onOpen(item),
    },
    onPress: () => onOpen(item),
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
  addTopic: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topicField: {
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 16,
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    padding: Spacing.four,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  sheet: {
    alignSelf: "center",
    width: "100%",
    maxWidth: 360,
    borderRadius: 16,
    borderWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
  topicOption: {
    minHeight: 44,
    justifyContent: "center",
  },
});
