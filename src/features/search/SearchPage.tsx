import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import {
  providerLabel,
  RESEARCH_PROVIDER_IDS,
  searchResources,
} from "@/features/resources";
import type {
  AccessStatus,
  FederatedSearchResult,
  ResourceKind,
  ResourceResult,
} from "@/features/resources";
import { ActionButton } from "@/shared/components/action-button";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";

import type { SearchKind } from "./catalog";
import { ResultCard, type SearchResult } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";

type FilterId = "all" | SearchKind;

const PAGE_SIZE = 8;

const accessKey: Record<AccessStatus, MessageKey> = {
  "open-access": "search.accessOpen",
  restricted: "search.accessRestricted",
  unknown: "search.accessUnknown",
};

export default function SearchPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const filters = [
    { id: "all" as const, label: t("search.all") },
    { id: "article" as const, label: t("search.articles") },
    { id: "document" as const, label: t("search.documents") },
    { id: "pack" as const, label: t("search.packs") },
  ];
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [submitted, setSubmitted] = useState("");
  const [items, setItems] = useState<ResourceResult[]>([]);
  const [page, setPage] = useState<FederatedSearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const handle = setTimeout(() => setSubmitted(query.trim()), 400);
    return () => clearTimeout(handle);
  }, [query]);

  useEffect(() => {
    if (submitted.length < 2) {
      setItems([]);
      setPage(null);
      setLoading(false);
      setFailed(false);
      return;
    }
    const controller = new AbortController();
    setLoading(true);
    setFailed(false);
    setPage(null);
    void searchResources(
      { query: submitted, pageSize: PAGE_SIZE, signal: controller.signal },
      RESEARCH_PROVIDER_IDS,
    )
      .then((next) => {
        if (controller.signal.aborted) return;
        setPage(next);
        setItems(next.results);
        setFailed(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setFailed(true);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [submitted]);

  async function loadMore() {
    if (!page?.nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const next = await searchResources(
        { query: submitted, pageSize: PAGE_SIZE, cursor: page.nextCursor },
        RESEARCH_PROVIDER_IDS,
      );
      setPage(next);
      setItems((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...next.results.filter((item) => !seen.has(item.id))];
      });
    } catch {
      setFailed(true);
    } finally {
      setLoadingMore(false);
    }
  }

  const results = useMemo(
    () => items.filter((item) => matchesFilter(item, filter)).map((item) => toCard(item, t)),
    [filter, items, t],
  );

  const searched = submitted.length >= 2;
  const offline = page?.networkUnavailable ?? false;
  const partial = page?.providers.some((status) => status.state === "error") ?? false;
  const countLabel =
    results.length === 1
      ? t(offline ? "search.oneResult" : "search.aboutOne")
      : t(offline ? "search.manyResults" : "search.aboutResults", { count: results.length });
  const message = failed
    ? t("search.resourcesFailed")
    : offline
      ? t("search.resourcesOffline")
      : null;

  return (
    <ThemedView style={styles.screen}>
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
        <SearchBrandHeader />
        <View
          style={[
            styles.field,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.dashboardBorder,
            },
          ]}
        >
          <SymbolView
            name={{ ios: "magnifyingglass", android: "search", web: "search" }}
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
        <ScrollView
          horizontal
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
        >
          {filters.map((option) => {
            const selected = option.id === filter;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => setFilter(option.id)}
                style={[
                  styles.chip,
                  {
                    backgroundColor: selected ? colors.tint : colors.backgroundElement,
                    borderColor: selected ? colors.tint : colors.dashboardBorder,
                  },
                ]}
              >
                <ThemedText
                  type={selected ? "smallBold" : "small"}
                  style={{ color: selected ? "#FFFFFF" : colors.textSecondary }}
                >
                  {option.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </ScrollView>
        {searched ? (
          <View style={styles.countRow}>
            {offline ? (
              <SymbolView
                name={{ ios: "wifi.slash", android: "wifi_off", web: "wifi_off" }}
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
        {message ? (
          <ThemedText accessibilityRole="alert" style={[styles.empty, { color: colors.error }]}>
            {message}
          </ThemedText>
        ) : null}
        <View style={styles.list}>
          {searched && !loading && !message && results.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {t("search.resourcesEmpty")}
            </ThemedText>
          ) : (
            results.map((result) => <ResultCard key={result.id} result={result} />)
          )}
        </View>
        {page?.nextCursor && !loading ? (
          <View style={styles.more}>
            <ActionButton
              label={loadingMore ? t("search.resourcesSearching") : t("search.resourcesMore")}
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
  if (filter === "all") return true;
  if (filter === "pack") return false;
  if (filter === "document") return item.kind === "book" || item.kind === "report";
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

function toCard(
  item: ResourceResult,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): SearchResult {
  const document = item.kind === "book" || item.kind === "report";
  const source = [item.provenance ?? providerLabel(item.provider), ...(item.alsoFoundAt ?? []).map(providerLabel)]
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
    onPress: () => {
      void Linking.openURL(item.sourceUrl);
    },
  };
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: 14,
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
  input: { flex: 1, fontSize: 16, minHeight: 48 },
  clear: {
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  chips: {
    gap: 8,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
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
