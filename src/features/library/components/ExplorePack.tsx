import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

import { formatCount, type KnowledgePackCard } from "../catalog";

export function ExplorePack({
  pack,
  onBack,
}: {
  pack: KnowledgePackCard;
  onBack: () => void;
}) {
  const colors = useTheme();

  return (
    <ScrollView
      contentContainerStyle={styles.scroll}
      showsVerticalScrollIndicator={false}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to library"
        onPress={onBack}
        style={styles.back}
      >
        <SymbolView
          name={{
            ios: "chevron.left",
            android: "arrow_back",
            web: "arrow_back",
          }}
          size={24}
          tintColor={colors.text}
        />
      </Pressable>
      <Image
        source={pack.image}
        contentFit="cover"
        style={styles.hero}
        accessibilityLabel=""
      />
      <ThemedText type="subtitle" accessibilityRole="header">
        {pack.title}
      </ThemedText>
      <ThemedText type="small" style={{ color: colors.tint }}>
        {`${formatCount(pack.articles)} articles · available offline`}
      </ThemedText>
      <ThemedText themeColor="textSecondary">{pack.description}</ThemedText>
      <View style={styles.list}>
        {pack.highlights.map((item) => (
          <View
            key={item}
            style={[
              styles.row,
              {
                backgroundColor: colors.backgroundElement,
                borderColor: colors.dashboardBorder,
              },
            ]}
          >
            <SymbolView
              name={{ ios: "book", android: "menu_book", web: "menu_book" }}
              size={20}
              tintColor={colors.tint}
            />
            <ThemedText type="smallBold" style={styles.rowLabel}>
              {item}
            </ThemedText>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
    paddingBottom: Spacing.four,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: -Spacing.two,
  },
  hero: { height: 180, borderRadius: 20 },
  list: { gap: 10, marginTop: Spacing.two },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  rowLabel: { flex: 1 },
});
