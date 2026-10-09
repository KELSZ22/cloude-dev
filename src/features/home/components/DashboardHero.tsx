import { Image } from "expo-image";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function DashboardHero() {
  const colors = useTheme();
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const { width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const height = Math.max(220, Math.min(width * 0.7, 300)) + insets.top;
  const headerColor = isDark ? Colors.dark.text : Colors.light.brand;

  return (
    <View style={[styles.hero, { height }]}>
      <Image
        source={require("@/assets/dashboard/dashboard.jpg")}
        contentFit="cover"
        contentPosition="center"
        accessible={false}
        accessibilityLabel=""
        style={StyleSheet.absoluteFill}
      />
      {isDark ? (
        <View
          pointerEvents="none"
          style={[styles.shade, { backgroundColor: Colors.dark.background }]}
        />
      ) : null}
      <View style={[styles.header, { paddingTop: insets.top + Spacing.two }]}>
        <View accessible accessibilityLabel="Seekora" style={styles.brand}>
          <Image
            source={
              isDark
                ? require("@/assets/logo/Seekora-textlogo-dark.png")
                : require("@/assets/logo/Seekora-textlogo-light.png")
            }
            contentFit="contain"
            accessible={false}
            accessibilityLabel=""
            style={styles.wordmark}
          />
        </View>
        <View style={styles.headerActions}>
          <Pressable
            disabled
            accessibilityRole="button"
            accessibilityLabel={t("home.notificationsSoon")}
            accessibilityState={{ disabled: true }}
            style={[styles.iconButton, styles.unavailable]}
          >
            <SymbolView
              name={{ ios: "bell", android: "notifications_none", web: "notifications_none" }}
              size={22}
              tintColor={headerColor}
            />
          </Pressable>
        </View>
      </View>
      <View style={[styles.greeting, { backgroundColor: colors.backgroundElement }]}>
        <View style={[styles.bubbleTail, { backgroundColor: colors.backgroundElement }]} />
        <ThemedText type="subtitle" style={styles.hello}>{t("home.hello")}</ThemedText>
        <ThemedText type="smallBold" style={styles.greetingText}>
          {t("home.greeting")}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { overflow: "hidden" },
  shade: { ...StyleSheet.absoluteFill, opacity: 0.45 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
  },
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { width: 120, height: 40 },
  headerActions: { flexDirection: "row" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  unavailable: { opacity: 0.45 },
  greeting: {
    position: "absolute",
    left: Spacing.three,
    bottom: 72,
    width: "36%",
    maxWidth: 160,
    borderRadius: 18,
    padding: 12,
    gap: Spacing.one,
  },
  bubbleTail: {
    position: "absolute",
    right: -5,
    bottom: 18,
    width: 14,
    height: 14,
    transform: [{ rotate: "45deg" }],
  },
  hello: { fontSize: 20, lineHeight: 24 },
  greetingText: { fontSize: 12, lineHeight: 16 },
});
