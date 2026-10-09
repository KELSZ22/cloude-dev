import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";

export function SettingsRow({
  icon,
  label,
  value,
  onPress,
  first = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value?: string;
  /** Omit to render the row as not yet available. */
  onPress?: () => void;
  first?: boolean;
}) {
  const colors = useTheme();
  const available = Boolean(onPress);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        available
          ? value
            ? `${label}, ${value}`
            : label
          : `${label}, coming soon`
      }
      accessibilityState={{ disabled: !available }}
      disabled={!available}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.border },
        pressed && available && { backgroundColor: colors.backgroundSelected },
      ]}
    >
      <SymbolView
        name={icon}
        size={21}
        tintColor={available ? colors.text : colors.textSecondary}
      />
      <ThemedText
        type="small"
        style={[styles.label, !available && { color: colors.textSecondary }]}
      >
        {label}
      </ThemedText>
      {available ? (
        <>
          {value ? (
            <ThemedText
              type="small"
              themeColor="textSecondary"
              style={styles.value}
              numberOfLines={1}
            >
              {value}
            </ThemedText>
          ) : null}
          <SymbolView
            name={{
              ios: "chevron.right",
              android: "chevron_right",
              web: "chevron_right",
            }}
            size={18}
            tintColor={colors.textSecondary}
          />
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.soon}>
          Soon
        </ThemedText>
      )}
    </Pressable>
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
  label: { flex: 1, fontSize: 15, lineHeight: 20, fontWeight: "500" },
  value: { fontSize: 13, lineHeight: 18, maxWidth: 150 },
  soon: { fontSize: 12, lineHeight: 16 },
});
