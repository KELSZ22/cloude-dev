import { useNavigation } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { FilterChips } from "@/shared/components/filter-chips";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { knowledgePacks, type PackCategory } from "./catalog";
import { DownloadComplete } from "./components/DownloadComplete";
import { DownloadView } from "./components/DownloadView";
import { ExplorePack } from "./components/ExplorePack";
import { PackCard } from "./components/PackCard";
import { useDownloadStore } from "./download-store";

const filters = [
  { id: "all", label: "All" },
  { id: "science", label: "Science" },
  { id: "history", label: "History" },
  { id: "technology", label: "Technology" },
  { id: "culture", label: "Culture" },
] as const;

type FilterId = (typeof filters)[number]["id"];

export default function LibraryPage() {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const searchRef = useRef<TextInput>(null);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<FilterId>("all");
  const [focusedPackId, setFocusedPackId] = useState<string | null>(null);
  const [exploreId, setExploreId] = useState<string | null>(null);
  const packId = useDownloadStore((state) => state.packId);
  const progress = useDownloadStore((state) => state.progress);
  const paused = useDownloadStore((state) => state.paused);
  const installed = useDownloadStore((state) => state.installed);
  const finishedId = useDownloadStore((state) => state.finishedId);
  const start = useDownloadStore((state) => state.start);
  const togglePause = useDownloadStore((state) => state.togglePause);
  const cancel = useDownloadStore((state) => state.cancel);
  const dismissFinished = useDownloadStore((state) => state.dismissFinished);

  const packs = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return knowledgePacks.filter((pack) => {
      const matchesCategory =
        filter === "all" || pack.category === (filter as PackCategory);
      if (!matchesCategory) return false;
      if (!needle) return true;
      return `${pack.title} ${pack.description}`.toLowerCase().includes(needle);
    });
  }, [filter, query]);

  const focused = knowledgePacks.find(
    (pack) => pack.id === focusedPackId && pack.id === packId,
  );
  const finished = knowledgePacks.find((pack) => pack.id === finishedId);
  const exploring = knowledgePacks.find((pack) => pack.id === exploreId);

  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: finished
        ? { display: "none" }
        : {
            backgroundColor: colors.backgroundElement,
            borderTopColor: colors.border,
          },
    });
  }, [colors.backgroundElement, colors.border, finished, navigation]);

  if (exploring) {
    return (
      <ThemedView
        style={[styles.screen, { paddingTop: insets.top + Spacing.two }]}
      >
        <ExplorePack pack={exploring} onBack={() => setExploreId(null)} />
      </ThemedView>
    );
  }

  if (finished) {
    return (
      <ThemedView
        style={[styles.screen, { paddingTop: insets.top + Spacing.two }]}
      >
        <DownloadComplete
          pack={finished}
          onBack={dismissFinished}
          onViewLibrary={dismissFinished}
          onExplore={() => {
            setExploreId(finished.id);
            dismissFinished();
          }}
        />
      </ThemedView>
    );
  }

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
        {focused ? (
          <DownloadView
            pack={focused}
            progress={progress}
            paused={paused}
            onBack={() => setFocusedPackId(null)}
            onTogglePause={togglePause}
            onCancel={() => {
              cancel();
              setFocusedPackId(null);
            }}
          />
        ) : (
          <>
            <View style={styles.header}>
              <ThemedText
                type="subtitle"
                accessibilityRole="header"
                style={styles.headerTitle}
              >
                Explore Knowledge Packs
              </ThemedText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Search packs"
                onPress={() => searchRef.current?.focus()}
                style={styles.iconButton}
              >
                <SymbolView
                  name={{
                    ios: "magnifyingglass",
                    android: "search",
                    web: "search",
                  }}
                  size={22}
                  tintColor={colors.text}
                />
              </Pressable>
            </View>
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
                name={{
                  ios: "magnifyingglass",
                  android: "search",
                  web: "search",
                }}
                size={20}
                tintColor={colors.textSecondary}
              />
              <TextInput
                ref={searchRef}
                value={query}
                onChangeText={setQuery}
                placeholder="Search packs..."
                placeholderTextColor={colors.textSecondary}
                accessibilityLabel="Search packs"
                autoCorrect={false}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
            <FilterChips
              options={filters}
              value={filter}
              onChange={setFilter}
            />
            <View style={styles.list}>
              {packs.length === 0 ? (
                <ThemedText themeColor="textSecondary" style={styles.empty}>
                  No knowledge packs match that search.
                </ThemedText>
              ) : (
                packs.map((pack) => {
                  const status = installed[pack.id]
                    ? "installed"
                    : packId === pack.id
                      ? "downloading"
                      : "ready";
                  return (
                    <PackCard
                      key={pack.id}
                      pack={pack}
                      status={status}
                      progress={packId === pack.id ? progress : 0}
                      onPress={() => {
                        if (status !== "downloading") start(pack.id);
                        setFocusedPackId(pack.id);
                      }}
                    />
                  );
                })
              )}
            </View>
          </>
        )}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.three,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingLeft: Spacing.three,
    paddingRight: Spacing.two,
  },
  headerTitle: { flex: 1, fontSize: 22, lineHeight: 28 },
  iconButton: {
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
  input: { flex: 1, fontSize: 16, minHeight: 48 },
  list: { gap: 12 },
  empty: { paddingHorizontal: Spacing.three },
});
