import { router, useLocalSearchParams } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ReadingShelf } from "@/features/offline-reading/components/ReadingShelf";
import { FilterChips } from "@/shared/components/filter-chips";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { contentSources } from "@/shared/constants/content-sources";
import {
  formatLibraryDate,
  libraryPacksForInstalled,
} from "@/shared/constants/sample-library";
import { BottomTabInset, Fonts, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { useReadingHistoryStore } from "@/shared/stores/reading-history-store";
import { usePackDownloadStore } from "@/shared/stores/pack-download-store";
import { EmptyShelf, NoteRow, PackRow, SectionHeader } from "./components";
import { TopicPackShelf } from "./components/TopicPackShelf";

type ShelfId = "reading" | "packs" | "history";

function matchesQuery(text: string, needle: string) {
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}

function libraryViewedDate(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return formatLibraryDate(iso.slice(0, 10));
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return formatLibraryDate(`${date.getFullYear()}-${month}-${day}`);
}

export default function LibraryPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const { shelf: requestedShelf } = useLocalSearchParams<{ shelf?: string }>();
  const selectedTopics = useOnboardingStore((state) => state.topics);
  const shelves = [
    { id: "reading" as const, label: t("reading.shelf") },
    ...(selectedTopics.length || contentSources.openStax
      ? [{ id: "packs" as const, label: t("library.packs") }]
      : []),
    { id: "history" as const, label: t("library.recentlyViewed") },
  ];
  const shelf = shelves.find((item) => item.id === requestedShelf)?.id ?? "reading";
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const installed = usePackDownloadStore((state) => state.installed);
  const catalogPacks = contentSources.openStax ? libraryPacksForInstalled(installed) : [];
  const [hiddenPackIds, setHiddenPackIds] = useState<string[]>([]);

  const needle = query.trim().toLowerCase();

  const packs = useMemo(
    () =>
      catalogPacks
        .filter((pack) => !hiddenPackIds.includes(pack.id))
        .filter((pack) => matchesQuery(pack.name, needle)),
    [catalogPacks, hiddenPackIds, needle],
  );
  const viewed = useReadingHistoryStore((state) => state.items);
  const history = useMemo(
    () =>
      viewed.filter(
        (entry) =>
          matchesQuery(entry.title, needle) || matchesQuery(entry.source, needle),
      ),
    [needle, viewed],
  );

  function selectShelf(next: ShelfId) {
    router.setParams({ shelf: next });
    setEditing(false);
  }

  function openSearch() {
    setSearchOpen(true);
    requestAnimationFrame(() => inputRef.current?.focus());
  }

  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    setEditing(false);
  }

  const shelfEmpty =
    needle.length > 0 &&
    ((shelf === "packs" && !selectedTopics.length && packs.length === 0) ||
      (shelf === "history" && history.length === 0));

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        {searchOpen ? (
          <View style={styles.searchRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("common.goBack")}
              onPress={closeSearch}
              style={styles.searchIcon}
            >
              <SymbolView
                name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
                size={22}
                tintColor={colors.text}
              />
            </Pressable>
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
                ref={inputRef}
                value={query}
                onChangeText={setQuery}
                placeholder={t("home.searchPlaceholder")}
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel={t("home.searchLibrary")}
                autoCorrect={false}
                style={[styles.input, { color: colors.text, fontFamily: Fonts.sans }]}
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
        ) : (
          <View style={styles.titleRow}>
            <ThemedText
              type="title"
              accessibilityRole="header"
              style={styles.title}
            >
              {t("library.title")}
            </ThemedText>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t("home.searchLibrary")}
              onPress={openSearch}
              style={({ pressed }) => [styles.searchIcon, pressed && styles.pressed]}
            >
              <SymbolView
                name={{
                  ios: "magnifyingglass",
                  android: "search",
                  web: "search",
                }}
                size={24}
                tintColor={colors.text}
              />
            </Pressable>
          </View>
        )}
        <FilterChips options={shelves} value={shelf} onChange={selectShelf} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        {shelf === "reading" ? <ReadingShelf query={query} /> : null}
        {shelfEmpty ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {t("search.empty")}
          </ThemedText>
        ) : null}

        {shelf === "packs" && selectedTopics.length ? (
          <TopicPackShelf query={query} />
        ) : null}

        {shelf === "packs" && !selectedTopics.length && !shelfEmpty ? (
          <View style={styles.section}>
            <SectionHeader
              title={t("library.downloadedPacks")}
              editing={editing}
              onToggleEdit={
                packs.length ? () => setEditing((value) => !value) : undefined
              }
            />
            {packs.length ? (
              packs.map((pack) => (
                <PackRow
                  key={pack.id}
                  pack={pack}
                  editing={editing}
                  onRemove={() => setHiddenPackIds((ids) => [...ids, pack.id])}
                />
              ))
            ) : (
              <EmptyShelf
                title={t("library.noPacksTitle")}
                body={t("library.noPacksBody")}
              />
            )}
          </View>
        ) : null}

        {shelf === "history" && !shelfEmpty ? (
          <View style={styles.section}>
            <SectionHeader title={t("library.recentlyViewed")} />
            {history.length === 0 ? (
              <ThemedText themeColor="textSecondary">{t("reading.noHistory")}</ThemedText>
            ) : null}
            {history.map((entry) => (
              <NoteRow
                key={entry.id}
                icon={{
                  ios: "clock.arrow.circlepath",
                  android: "history",
                  web: "history",
                }}
                accent={colors.accentBlue}
                title={entry.title}
                meta={libraryViewedDate(entry.viewedAt)}
                onPress={() => router.push({ pathname: "/read/[id]", params: { id: entry.id } })}
              />
            ))}
          </View>
        ) : null}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.two,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: Spacing.three,
    gap: 4,
  },
  title: { flex: 1, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  searchIcon: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  field: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    borderRadius: 26,
    borderWidth: 1,
  },
  input: { flex: 1, fontSize: 16, minHeight: 48 },
  clear: { width: 32, height: 32, alignItems: "center", justifyContent: "center" },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  empty: { fontSize: 15, lineHeight: 22 },
  pressed: { opacity: 0.6 },
});
