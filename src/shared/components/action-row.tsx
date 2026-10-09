import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

/** A row the user can act on. Without `onPress` it reads as a feature that is not ready yet. */
export function ActionRow({
  icon,
  label,
  value,
  onPress,
  disabled = false,
  destructive = false,
  first = false,
}: {
  icon: SymbolViewProps["name"];
  label: string;
  value?: string;
  /** Omit to render the row as not yet available. */
  onPress?: () => void;
  /** Set when the action exists but cannot run right now. */
  disabled?: boolean;
  destructive?: boolean;
  first?: boolean;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const available = Boolean(onPress);
  const soon = t("common.comingSoon");
  const inactive = !available || disabled;
  const labelColor = inactive
    ? colors.textSecondary
    : destructive
      ? colors.error
      : colors.text;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        available ? (value ? `${label}, ${value}` : label) : `${label}, ${soon}`
      }
      accessibilityState={{ disabled: inactive }}
      disabled={inactive}
      onPress={onPress}
      style={({ pressed }) => [
        styles.row,
        !first && { borderTopWidth: 1, borderTopColor: colors.border },
        pressed && !inactive && { backgroundColor: colors.backgroundSelected },
      ]}
    >
      <SymbolView
        name={icon}
        size={21}
        tintColor={inactive ? colors.textSecondary : destructive ? colors.error : colors.text}
      />
      <ThemedText type="small" style={[styles.label, { color: labelColor }]}>
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
            name={{ ios: "chevron.right", android: "chevron_right", web: "chevron_right" }}
            size={18}
            tintColor={colors.textSecondary}
          />
        </>
      ) : (
        <ThemedText type="small" themeColor="textSecondary" style={styles.soon}>
          {t("common.soon")}
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
