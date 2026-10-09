import { Image } from "expo-image";
import { StyleSheet, View } from "react-native";

import { LanguageMenu } from "@/shared/components/language-menu";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";

export function SearchBrandHeader() {
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
        <LanguageMenu tintColor={iconColor} />
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
});
