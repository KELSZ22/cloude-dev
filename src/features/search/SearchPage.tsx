import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { FilterChips } from "@/shared/components/filter-chips";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { articles, type SearchKind } from "./catalog";
import { PassageResultCard } from "./components/PassageResultCard";
import { ResultCard } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";
import { useLocalSearch } from "./hooks/useLocalSearch";

const filters = [
  { id: "all", label: "All" },
  { id: "article", label: "Articles" },
  { id: "document", label: "Documents" },
  { id: "pack", label: "Packs" },
] as const;

type FilterId = (typeof filters)[number]["id"];

export default function SearchPage() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState("renewable energy");
  const [filter, setFilter] = useState<FilterId>("all");

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

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + Spacing.two, paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        <SearchBrandHeader />
        <View
          style={[
            styles.field,
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
            placeholder="Search anything..."
            placeholderTextColor={colors.textSecondary}
            accessibilityLabel="Search your library"
            autoCorrect={false}
            style={[styles.input, { color: colors.text }]}
          />
          {query.length > 0 ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
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
        <FilterChips options={filters} value={filter} onChange={setFilter} />
        <ThemedText type="smallBold" style={[styles.count, { color: colors.tint }]}>
          {total === 1 ? "1 result (offline)" : `${total} results (offline)`}
        </ThemedText>
        {library.error ? (
          <ThemedText themeColor="error" accessibilityRole="alert" style={styles.empty}>
            {library.error}
          </ThemedText>
        ) : null}
        <View style={styles.list}>
          {total === 0 && !library.pending ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              Nothing in your offline library matches that search.
            </ThemedText>
          ) : null}
          {passages.map((hit) => (
            <PassageResultCard key={hit.chunkId} hit={hit} />
          ))}
          {results.map((article) => (
            <ResultCard key={article.id} article={article} />
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { width: "100%", maxWidth: 600, alignSelf: "center", gap: Spacing.three },
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
  clear: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  count: { paddingHorizontal: Spacing.three },
  list: { gap: 12 },
  empty: { paddingHorizontal: Spacing.three },
});
