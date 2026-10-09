import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";

/** States a fact about this phone. Shares the action row's metrics so groups can mix the two. */
export function InfoRow({
  icon,
  label,
  value,
  first = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value: string;
  first?: boolean;
}) {
  const colors = useTheme();

  return (
    <View
      accessible
      accessibilityLabel={`${label}, ${value}`}
      style={[styles.row, !first && { borderTopWidth: 1, borderTopColor: colors.border }]}
    >
      <SymbolView name={icon} size={21} tintColor={colors.textSecondary} />
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
      <ThemedText type="small" themeColor="textSecondary" style={styles.value}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 56,
    paddingHorizontal: 14,
  },
  label: { fontSize: 15, lineHeight: 20, fontWeight: "500" },
  value: { flex: 1, fontSize: 13, lineHeight: 18, textAlign: "right" },
});
