import { Image } from "expo-image";
import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { PillButton } from "@/shared/components/pill-button";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { withAlpha } from "@/shared/lib/color";

const issues: { key: MessageKey; icon: SymbolViewProps["name"] }[] = [
  {
    key: "search.issueStorage",
    icon: { ios: "externaldrive.fill", android: "storage", web: "storage" },
  },
  {
    key: "search.issueConnection",
    icon: { ios: "wifi.slash", android: "wifi_off", web: "wifi_off" },
  },
  {
    key: "search.issueFile",
    icon: {
      ios: "exclamationmark.triangle.fill",
      android: "warning",
      web: "warning",
    },
  },
];

export function DownloadFailed({
  onBack,
  onRetry,
  onCancel,
}: {
  onBack: () => void;
  onRetry: () => void;
  onCancel: () => void;
}) {
  const colors = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  return (
    <ThemedView style={styles.screen}>
      <LeafDecor width={130} />
      <View style={[styles.header, { paddingTop: insets.top + Spacing.one }]}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.goBack")}
          onPress={onBack}
          style={styles.back}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        <Image
          source={require("@/assets/results/error.png")}
          accessibilityLabel={t("challenge.artPuzzle")}
          contentFit="contain"
          style={styles.art}
        />
        <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
          {t("search.downloadFailed")}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          {t("search.downloadFailedBody")}
        </ThemedText>

        <View style={[styles.card, { backgroundColor: colors.backgroundSelected }]}>
          <ThemedText type="smallBold">{t("search.possibleIssues")}</ThemedText>
          {issues.map((issue) => (
            <View key={issue.key} style={styles.issue}>
              <View style={[styles.icon, { backgroundColor: withAlpha(colors.error, 0.12) }]}>
                <SymbolView name={issue.icon} size={16} tintColor={colors.error} />
              </View>
              <ThemedText type="small" style={styles.issueText}>
                {t(issue.key)}
              </ThemedText>
            </View>
          ))}
        </View>

        <View style={styles.actions}>
          <PillButton
            label={t("challenge.tryAgain")}
            icon={{ ios: "arrow.clockwise", android: "refresh", web: "refresh" }}
            onPress={onRetry}
          />
          <PillButton label={t("common.cancel")} variant="outline" onPress={onCancel} />
        </View>
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
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    alignItems: "center",
    paddingHorizontal: Spacing.three,
    gap: Spacing.two,
  },
  art: { width: 230, maxWidth: "72%", aspectRatio: 1448 / 1086 },
  title: { fontSize: 22, lineHeight: 28, textAlign: "center" },
  body: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    paddingHorizontal: Spacing.three,
  },
  card: {
    width: "100%",
    borderRadius: 18,
    padding: Spacing.three,
    gap: 12,
    marginTop: Spacing.two,
  },
  issue: { flexDirection: "row", alignItems: "center", gap: 12 },
  icon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  issueText: { flex: 1, fontSize: 14, lineHeight: 20 },
  actions: { width: "100%", gap: Spacing.two, marginTop: Spacing.two },
});
