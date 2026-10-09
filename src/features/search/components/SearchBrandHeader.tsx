import { Image } from "expo-image";
import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { Colors, Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function SearchBrandHeader() {
  const colors = useTheme();
  const { t } = useTranslation();
  const isDark = useColorScheme() === "dark";
  const iconColor = isDark ? Colors.dark.text : Colors.light.brand;

  return (
    <View style={styles.header}>
      <View accessible accessibilityLabel="Seekora" style={styles.brand}>
        <Image
          source={
            isDark
              ? require("@/assets/logo/logo-default.png")
              : require("@/assets/logo/logo-greenbg.png")
          }
          contentFit="contain"
          accessible={false}
          accessibilityLabel=""
          style={styles.logo}
        />
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
      <View style={styles.actions}>
        <Pressable
          disabled
          accessibilityRole="button"
          accessibilityLabel={t("home.notificationsSoon")}
          accessibilityState={{ disabled: true }}
          style={styles.iconButton}
        >
          <SymbolView
            name={{ ios: "bell", android: "notifications_none", web: "notifications_none" }}
            size={22}
            tintColor={iconColor}
          />
          <View style={[styles.badge, { borderColor: colors.background }]} />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.openSettings")}
          onPress={() => router.navigate("/(tabs)/settings")}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ ios: "gearshape", android: "settings", web: "settings" }}
            size={22}
            tintColor={iconColor}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: Spacing.three,
  },
  brand: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  logo: { width: 36, height: 36 },
  wordmark: { width: 118, height: 36 },
  actions: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  badge: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#F97316",
    borderWidth: 1.5,
  },
  pressed: { opacity: 0.6 },
});
