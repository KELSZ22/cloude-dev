import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { DashboardActionCard } from "./components/DashboardActionCard";
import { DashboardHero } from "./components/DashboardHero";

export default function HomePage() {
  const colors = useTheme();

  return (
    <ThemedView type="backgroundWarm" style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <DashboardHero />
        <View style={styles.content}>
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.dashboardBorder,
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search your library"
              onPress={() => router.navigate("/(tabs)/search")}
              style={({ pressed }) => [
                styles.searchAction,
                pressed && styles.pressed,
              ]}
            >
              <SymbolView
                name={{
                  ios: "magnifyingglass",
                  android: "search",
                  web: "search",
                }}
                size={24}
                tintColor={colors.tint}
              />
              <ThemedText themeColor="textSecondary" style={styles.searchLabel}>
                Search anything...
              </ThemedText>
            </Pressable>
            <Pressable
              disabled
              accessibilityRole="button"
              accessibilityLabel="Voice search, coming soon"
              accessibilityState={{ disabled: true }}
              style={styles.microphone}
            >
              <SymbolView
                name={{ ios: "mic.fill", android: "mic", web: "mic" }}
                size={22}
                tintColor={colors.textSecondary}
              />
            </Pressable>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ask AI a question"
            onPress={() => router.navigate("/(tabs)/assistant")}
            style={({ pressed }) => [
              styles.assistant,
              {
                borderColor: colors.dashboardBorder,
                backgroundColor: pressed
                  ? colors.backgroundSelected
                  : colors.backgroundElement,
              },
            ]}
          >
            <SymbolView
              name={{
                ios: "sparkles",
                android: "auto_awesome",
                web: "auto_awesome",
              }}
              size={23}
              tintColor={colors.tint}
            />
            <ThemedText type="smallBold" style={styles.grow}>
              Ask AI a question
            </ThemedText>
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>

          <View style={styles.section}>
            <ThemedText
              type="subtitle"
              accessibilityRole="header"
              style={styles.sectionTitle}
            >
              Get started
            </ThemedText>
            <View style={styles.grid}>
              <DashboardActionCard
                label="Explore Knowledge Packs"
                title={"Explore\nKnowledge Packs"}
                href="/(tabs)/library"
                icon={{ ios: "book", android: "menu_book", web: "menu_book" }}
                accent={colors.tint}
              />
              <DashboardActionCard
                label="Add Documents"
                title={"Add\nDocuments"}
                href="/import"
                icon={{
                  ios: "doc.text",
                  android: "description",
                  web: "description",
                }}
                accent={colors.accentBlue}
              />
              <DashboardActionCard
                label="Try a Knowledge Challenge"
                title={"Try a\nKnowledge Challenge"}
                icon={{ ios: "star.fill", android: "star", web: "star" }}
                accent={colors.accentGold}
              />
              <DashboardActionCard
                label="View Your Library"
                title={"View\nYour Library"}
                href="/(tabs)/library"
                icon={{ ios: "leaf", android: "eco", web: "eco" }}
                accent={colors.tint}
                useLogo
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Prepare for offline use"
            onPress={() => router.navigate("/setup")}
            style={({ pressed }) => [
              styles.offline,
              {
                backgroundColor: colors.backgroundSelected,
                borderColor: colors.dashboardBorder,
              },
              pressed && styles.pressed,
            ]}
          >
            <SymbolView
              name={{ ios: "wifi", android: "wifi", web: "wifi" }}
              size={30}
              tintColor={colors.tint}
            />
            <View style={styles.grow}>
              <ThemedText type="smallBold">Prepare for offline use</ThemedText>
              <ThemedText
                type="small"
                themeColor="textSecondary"
                style={styles.offlineDescription}
              >
                Set up knowledge packs and an AI model to explore offline.
              </ThemedText>
            </View>
            <SymbolView
              name={{
                ios: "chevron.right",
                android: "chevron_right",
                web: "chevron_right",
              }}
              size={20}
              tintColor={colors.tint}
            />
          </Pressable>
        </View>
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
    paddingBottom: Spacing.three,
  },
  content: { marginTop: -28, paddingHorizontal: Spacing.three, gap: 12 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    borderWidth: 1,
    borderRadius: 20,
    boxShadow: "0 3px 9px rgba(4, 120, 87, 0.12)",
  },
  searchAction: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingLeft: Spacing.three,
  },
  searchLabel: { flex: 1, fontSize: 14 },
  microphone: {
    width: 48,
    minHeight: 48,
    alignItems: "center",
    justifyContent: "center",
    opacity: 0.5,
  },
  assistant: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 48,
    paddingHorizontal: Spacing.three,
    borderWidth: 1,
    borderRadius: 16,
  },
  grow: { flex: 1 },
  section: { gap: 12, marginTop: Spacing.one },
  sectionTitle: { fontSize: 18, lineHeight: 24 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  offline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    minHeight: 76,
    borderWidth: 1,
    borderRadius: 16,
  },
  offlineDescription: { fontSize: 12, lineHeight: 16, marginTop: Spacing.one },
  pressed: { opacity: 0.7 },
});
