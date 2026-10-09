import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import {
  formatLibraryDate,
  sampleBookmarks,
  sampleDocuments,
  sampleHistory,
  samplePacks,
} from "@/shared/constants/sample-library";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import {
  DocumentRow,
  EmptyShelf,
  FilterChips,
  NoteRow,
  PackRow,
  SectionHeader,
} from "./components";

type ShelfId = "packs" | "documents" | "bookmarks" | "history";

export default function LibraryPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const shelves = [
    { id: "packs" as const, label: t("library.packs") },
    { id: "documents" as const, label: t("library.documents") },
    { id: "bookmarks" as const, label: t("library.bookmarks") },
    { id: "history" as const, label: t("library.history") },
  ];
  const [shelf, setShelf] = useState<ShelfId>("packs");
  const [editing, setEditing] = useState(false);
  const [packIds, setPackIds] = useState(samplePacks.map((pack) => pack.id));
  const [documentIds, setDocumentIds] = useState(
    sampleDocuments.map((document) => document.id),
  );

  const packs = samplePacks.filter((pack) => packIds.includes(pack.id));
  const documents = sampleDocuments.filter((document) =>
    documentIds.includes(document.id),
  );

  function selectShelf(next: ShelfId) {
    setShelf(next);
    setEditing(false);
  }

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
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
            onPress={() => router.navigate("/(tabs)/search")}
            style={({ pressed }) => [styles.search, pressed && styles.pressed]}
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
        <FilterChips options={shelves} value={shelf} onChange={selectShelf} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        {shelf === "packs" ? (
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

        {shelf === "documents" ? (
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

        {shelf === "bookmarks" ? (
          <View style={styles.section}>
            <SectionHeader title={t("library.savedPassages")} />
            {sampleBookmarks.map((bookmark) => (
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

        {shelf === "history" ? (
          <View style={styles.section}>
            <SectionHeader title={t("library.recentlyViewed")} />
            {sampleHistory.map((entry) => (
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
  title: { flex: 1, fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  search: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.four,
  },
  section: { gap: Spacing.two },
  pressed: { opacity: 0.6 },
});
