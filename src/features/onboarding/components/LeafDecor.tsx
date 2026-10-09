import { StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { useTheme } from "@/shared/hooks/use-theme";

export function LeafDecor() {
  const colors = useTheme();
  return (
    <>
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={88}
        tintColor={colors.tint}
        style={styles.topLeft}
      />
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={72}
        tintColor={colors.tint}
        style={styles.topRight}
      />
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={96}
        tintColor={colors.tint}
        style={styles.bottomLeft}
      />
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={80}
        tintColor={colors.tint}
        style={styles.bottomRight}
      />
    </>
  );
}

const styles = StyleSheet.create({
  topLeft: {
    position: "absolute",
    top: -12,
    left: -16,
    opacity: 0.22,
    transform: [{ rotate: "-24deg" }],
  },
  topRight: {
    position: "absolute",
    top: 8,
    right: -18,
    opacity: 0.18,
    transform: [{ rotate: "28deg" }],
  },
  bottomLeft: {
    position: "absolute",
    bottom: 48,
    left: -22,
    opacity: 0.16,
    transform: [{ rotate: "16deg" }],
  },
  bottomRight: {
    position: "absolute",
    bottom: 36,
    right: -20,
    opacity: 0.2,
    transform: [{ rotate: "-18deg" }],
  },
});
