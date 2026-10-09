import { SymbolView } from "expo-symbols";
import { useMemo, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterChips } from "@/shared/components/filter-chips";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import {
  formatLibraryDate,
  sampleBookmarks,
  sampleDocuments,
  sampleHistory,
  samplePacks,
} from "@/shared/constants/sample-library";
import { BottomTabInset, Fonts, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import {
  DocumentRow,
  EmptyShelf,
  NoteRow,
  PackRow,
  SectionHeader,
} from "./components";

type ShelfId = "packs" | "documents" | "bookmarks" | "history";

function matchesQuery(text: string, needle: string) {
  if (!needle) return true;
  return text.toLowerCase().includes(needle);
}

export default function LibraryPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const shelves = [
    { id: "packs" as const, label: t("library.packs") },
    { id: "documents" as const, label: t("library.documents") },
    { id: "bookmarks" as const, label: t("library.bookmarks") },
    { id: "history" as const, label: t("library.history") },
  ];
  const [shelf, setShelf] = useState<ShelfId>("packs");
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [packIds, setPackIds] = useState(samplePacks.map((pack) => pack.id));
  const [documentIds, setDocumentIds] = useState(
    sampleDocuments.map((document) => document.id),
  );

  const needle = query.trim().toLowerCase();

  const packs = useMemo(
    () =>
      samplePacks
        .filter((pack) => packIds.includes(pack.id))
        .filter((pack) => matchesQuery(pack.name, needle)),
    [needle, packIds],
  );
  const documents = useMemo(
    () =>
      sampleDocuments
        .filter((document) => documentIds.includes(document.id))
        .filter((document) => matchesQuery(document.name, needle)),
    [documentIds, needle],
  );
  const bookmarks = useMemo(
    () =>
      sampleBookmarks.filter(
        (bookmark) =>
          matchesQuery(bookmark.title, needle) ||
          matchesQuery(bookmark.source, needle),
      ),
    [needle],
  );
  const history = useMemo(
    () =>
      sampleHistory.filter(
        (entry) =>
          matchesQuery(entry.query, needle) || matchesQuery(entry.source, needle),
      ),
    [needle],
  );

  function selectShelf(next: ShelfId) {
    setShelf(next);
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
    ((shelf === "packs" && packs.length === 0) ||
      (shelf === "documents" && documents.length === 0) ||
      (shelf === "bookmarks" && bookmarks.length === 0) ||
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
        {shelfEmpty ? (
          <ThemedText themeColor="textSecondary" style={styles.empty}>
            {t("search.empty")}
          </ThemedText>
        ) : null}

        {shelf === "packs" && !shelfEmpty ? (
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
                  onRemove={() =>
                    setPackIds((ids) => ids.filter((id) => id !== pack.id))
                  }
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

        {shelf === "documents" && !shelfEmpty ? (
          <View style={styles.section}>
            <SectionHeader
              title={t("library.myDocuments")}
              editing={editing}
              onToggleEdit={
                documents.length
                  ? () => setEditing((value) => !value)
                  : undefined
              }
            />
            {documents.length ? (
              documents.map((document) => (
                <DocumentRow
                  key={document.id}
                  document={document}
                  editing={editing}
                  onRemove={() =>
                    setDocumentIds((ids) =>
                      ids.filter((id) => id !== document.id),
                    )
                  }
                />
              ))
            ) : (
              <EmptyShelf
                title={t("library.noDocumentsTitle")}
                body={t("library.noDocumentsBody")}
              />
            )}
          </View>
        ) : null}

        {shelf === "bookmarks" && !shelfEmpty ? (
          <View style={styles.section}>
            <SectionHeader title={t("library.savedPassages")} />
            {bookmarks.map((bookmark) => (
              <NoteRow
                key={bookmark.id}
                icon={{
                  ios: "bookmark.fill",
                  android: "bookmark",
                  web: "bookmark",
                }}
                accent={colors.accentGold}
                title={bookmark.title}
                meta={`${bookmark.source} · ${t("library.savedOn", { date: formatLibraryDate(bookmark.savedAt) })}`}
              />
            ))}
          </View>
        ) : null}

        {shelf === "history" && !shelfEmpty ? (
          <View style={styles.section}>
            <SectionHeader title={t("library.recentlyViewed")} />
            {history.map((entry) => (
              <NoteRow
                key={entry.id}
                icon={{
                  ios: "clock.arrow.circlepath",
                  android: "history",
                  web: "history",
                }}
                accent={colors.accentBlue}
                title={entry.query}
                meta={`${entry.source} · ${formatLibraryDate(entry.viewedAt)}`}
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
  header: { width: "100%", maxWidth: 600, alignSelf: "center", gap: Spacing.two },
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
