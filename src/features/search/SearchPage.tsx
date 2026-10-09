import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { FilterChips } from "@/shared/components/filter-chips";
import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

import { articles, type CatalogArticle, type SearchKind } from "./catalog";
import { DownloadFailed } from "./components/DownloadFailed";
import { EmptyResults } from "./components/EmptyResults";
import { PassageResultCard } from "./components/PassageResultCard";
import { ResultCard } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";
import { downloadSearchPack } from "./download-pack";
import { useLocalSearch } from "./hooks/useLocalSearch";

type FilterId = "all" | "article" | "document" | "pack";

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
  const [query, setQuery] = useState("renewable energy");
  const [filter, setFilter] = useState<FilterId>("all");
  const [failedPackId, setFailedPackId] = useState<string | null>(null);

  // Passages from the installed knowledge packs, searched in the local full-text index.
  const library = useLocalSearch(query);
  const passages = filter === "all" || filter === "article" ? library.hits : [];

  // Sample catalog entries, shown until every pack is served from local storage.
  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return articles.filter((article) => {
      const matchesKind = filter === "all" || article.kind === (filter as SearchKind);
      if (!matchesKind) return false;
      if (!needle) return true;
      const haystack = `${article.title} ${article.pack} ${article.summary} ${article.tags}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [filter, query]);

  const total = passages.length + results.length;
  const noResults =
    query.trim().length > 0 &&
    total === 0 &&
    (!library.pending || library.error !== null || !library.ready);

  function attemptDownload(article: CatalogArticle) {
    const result = downloadSearchPack(article.id);
    setFailedPackId(result.ok ? null : article.id);
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
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset + Spacing.four },
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
                name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                size={22}
                tintColor={colors.text}
              />
            </Pressable>
          ) : null}
        <View
          style={[
            styles.field,
            noResults ? styles.fieldInRow : null,
            { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder },
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
            <FilterChips options={filters} value={filter} onChange={setFilter} />
            <ThemedText type="smallBold" style={[styles.count, { color: colors.tint }]}>
              {total === 1
                ? t("search.oneResult")
                : t("search.manyResults", { count: total })}
            </ThemedText>
          </>
        )}
        {library.error && !noResults ? (
          <ThemedText themeColor="error" accessibilityRole="alert" style={styles.empty}>
            {library.error}
          </ThemedText>
        ) : null}
        <View style={styles.list}>
          {noResults ? <EmptyResults query={query.trim()} /> : null}
          {passages.map((hit) => (
            <PassageResultCard key={hit.chunkId} hit={hit} />
          ))}
          {results.map((article) => (
            <ResultCard key={article.id} article={article} onPackPress={attemptDownload} />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { width: "100%", maxWidth: 600, alignSelf: "center", gap: Spacing.three },
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
  clear: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  count: { paddingHorizontal: Spacing.three },
  list: { gap: 12 },
  empty: { paddingHorizontal: Spacing.three },
});
