import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";

const tips: MessageKey[] = [
  "search.tipSpelling",
  "search.tipKeywords",
  "search.tipTopics",
  "search.tipPacks",
];

export function EmptyResults({ query }: { query: string }) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.wrap}>
      <Image
        source={require("@/assets/results/noresult.png")}
        accessibilityLabel={t("search.emptyArt")}
        contentFit="contain"
        style={styles.art}
      />
      <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
        {t("search.emptyTitle")}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {t("search.emptyBody", { query })}
      </ThemedText>

      <View style={[styles.card, { backgroundColor: colors.backgroundSelected }]}>
        <View style={styles.cardTitle}>
          <SymbolView
            name={{ ios: "lightbulb.fill", android: "lightbulb", web: "lightbulb" }}
            size={18}
            tintColor={colors.accentGold}
          />
          <ThemedText type="smallBold">{t("search.tryInstead")}</ThemedText>
        </View>
        {tips.map((tip) => (
          <View key={tip} style={styles.tip}>
            <View style={[styles.dot, { backgroundColor: colors.textSecondary }]} />
            <ThemedText type="small" themeColor="textSecondary" style={styles.tipText}>
              {t(tip)}
            </ThemedText>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  art: { width: 220, maxWidth: "70%", aspectRatio: 1448 / 1086 },
  title: { fontSize: 22, lineHeight: 28, textAlign: "center" },
  body: { fontSize: 15, lineHeight: 22, textAlign: "center", paddingHorizontal: Spacing.two },
  card: {
    width: "100%",
    borderRadius: 18,
    padding: Spacing.three,
    gap: 10,
    marginTop: Spacing.two,
  },
  cardTitle: { flexDirection: "row", alignItems: "center", gap: 8 },
  tip: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 4 },
  dot: { width: 5, height: 5, borderRadius: 3 },
  tipText: { flex: 1, fontSize: 14, lineHeight: 20 },
});
