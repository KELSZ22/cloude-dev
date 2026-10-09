import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

export function NoteRow({
  icon,
  accent,
  title,
  meta,
}: {
  icon: SymbolViewProps["name"];
  accent: string;
  title: string;
  meta: string;
}) {
  const colors = useTheme();

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: colors.backgroundElement,
          borderColor: colors.border,
        },
      ]}
    >
      <View style={[styles.tile, { backgroundColor: withAlpha(accent, 0.12) }]}>
        <SymbolView name={icon} size={20} tintColor={accent} />
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={2}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {meta}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  tile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: Spacing.half },
  title: { fontSize: 14, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
});
