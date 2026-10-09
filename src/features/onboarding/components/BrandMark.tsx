import { StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedView } from "@/shared/components/themed-view";
import { useTheme } from "@/shared/hooks/use-theme";

export function BrandMark({ size = 64 }: { size?: number }) {
  const colors = useTheme();
  const icon = Math.round(size * 0.5);
  return (
    <ThemedView
      type="tint"
      style={[
        styles.mark,
        { width: size, height: size, borderRadius: size * 0.28 },
      ]}
    >
      <SymbolView
        name={{ ios: "leaf.fill", android: "eco", web: "eco" }}
        size={icon}
        tintColor={colors.backgroundElement}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  mark: { alignItems: "center", justifyContent: "center" },
});
