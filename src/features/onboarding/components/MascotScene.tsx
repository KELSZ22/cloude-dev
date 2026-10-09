import { StyleSheet, View } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

type Scene = "welcome" | "companion" | "explore";

export function MascotScene({ scene }: { scene: Scene }) {
  const colors = useTheme();
  return (
    <ThemedView type="backgroundSelected" style={styles.frame}>
      <View
        style={[styles.hill, styles.hillBack, { backgroundColor: colors.tint }]}
      />
      <View
        style={[
          styles.hill,
          styles.hillFront,
          { backgroundColor: colors.tintPressed },
        ]}
      />
      <ThemedView type="backgroundElement" style={styles.character}>
        <SymbolView
          name={{
            ios:
              scene === "explore"
                ? "map.fill"
                : scene === "companion"
                  ? "book.fill"
                  : "figure.walk",
            android:
              scene === "explore"
                ? "map"
                : scene === "companion"
                  ? "menu_book"
                  : "hiking",
            web:
              scene === "explore"
                ? "map"
                : scene === "companion"
                  ? "menu_book"
                  : "hiking",
          }}
          size={48}
          tintColor={colors.tint}
        />
        <ThemedText type="smallBold" themeColor="tint">
          {scene === "welcome"
            ? "Ready to explore"
            : scene === "companion"
              ? "Learn anywhere"
              : "Find your path"}
        </ThemedText>
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: "100%",
    height: 280,
    borderRadius: 28,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: Spacing.four,
  },
  hill: {
    position: "absolute",
    width: "140%",
    height: "42%",
    borderRadius: 999,
  },
  hillBack: { bottom: -28, left: "-28%", opacity: 0.35 },
  hillFront: { bottom: -48, right: "-22%", opacity: 0.28 },
  character: {
    alignItems: "center",
    gap: Spacing.two,
    paddingVertical: Spacing.three,
    paddingHorizontal: Spacing.four,
    borderRadius: 20,
  },
});
