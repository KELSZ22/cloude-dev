import { Image } from "expo-image";
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
          style={styles.iconButton}
        >
          <SymbolView
            name={{ ios: "bell", android: "notifications_none", web: "notifications_none" }}
            size={22}
            tintColor={iconColor}
          />
          <View style={[styles.badge, { borderColor: colors.background }]} />
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
  wordmark: { width: 118, height: 36 },
  actions: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 44,
    height: 44,
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
});
