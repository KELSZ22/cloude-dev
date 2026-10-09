import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import {
  formatLibraryDate,
  formatMegabytes,
  type LibraryPack,
} from "@/shared/constants/sample-library";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { withAlpha } from "@/shared/lib/color";
import { RowTrailing } from "./RowTrailing";

export function PackRow({
  pack,
  editing,
  onRemove,
}: {
  pack: LibraryPack;
  editing: boolean;
  onRemove: () => void;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const accent = colors[pack.accent];

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
      <View
        style={[
          styles.tile,
          {
            backgroundColor: withAlpha(accent, 0.12),
            borderColor: withAlpha(accent, 0.24),
          },
        ]}
      >
        <SymbolView name={pack.icon} size={26} tintColor={accent} />
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {pack.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {t("library.packMeta", {
            count: pack.articles.toLocaleString(),
            size: formatMegabytes(pack.sizeMb),
          })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {t("library.updated", { date: formatLibraryDate(pack.updatedAt) })}
        </ThemedText>
      </View>
      <RowTrailing name={pack.name} editing={editing} onRemove={onRemove} />
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
    width: 56,
    height: 56,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  body: { flex: 1, gap: Spacing.half },
  title: { fontSize: 15, lineHeight: 20 },
  meta: { fontSize: 12, lineHeight: 16, fontWeight: "500" },
});
