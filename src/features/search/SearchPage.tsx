import { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { SymbolView } from "expo-symbols";

import { FilterChips } from "@/shared/components/filter-chips";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

import { articles, type SearchKind } from "./catalog";
import { ResultCard } from "./components/ResultCard";
import { SearchBrandHeader } from "./components/SearchBrandHeader";

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
  const [query, setQuery] = useState("biology");
  const [filter, setFilter] = useState<FilterId>("all");

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
        <FilterChips options={filters} value={filter} onChange={setFilter} />
        <ThemedText type="smallBold" style={[styles.count, { color: colors.tint }]}>
          {results.length === 1
            ? t("search.oneResult")
            : t("search.manyResults", { count: results.length })}
        </ThemedText>
        <View style={styles.list}>
          {results.length === 0 ? (
            <ThemedText themeColor="textSecondary" style={styles.empty}>
              {t("search.empty")}
            </ThemedText>
          ) : (
            results.map((article) => <ResultCard key={article.id} article={article} />)
          )}
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
