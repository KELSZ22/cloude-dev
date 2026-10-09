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
          style={[styles.iconButton, styles.unavailable]}
        >
          <SymbolView
            name={{ ios: "bell", android: "notifications_none", web: "notifications_none" }}
            size={22}
            tintColor={iconColor}
          />
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("home.openSettings")}
          onPress={() => router.navigate("/(tabs)/settings")}
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}
        >
          <SymbolView
            name={{ ios: "person.circle", android: "account_circle", web: "account_circle" }}
            size={24}
            tintColor={colors.tint}
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
  brand: { flexDirection: "row", alignItems: "center" },
  wordmark: { width: 112, height: 36 },
  actions: { flexDirection: "row" },
  iconButton: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  unavailable: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});
