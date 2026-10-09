import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import {
  formatLibraryDate,
  formatMegabytes,
  type LibraryDocument,
} from "@/shared/constants/sample-library";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";
import { RowTrailing } from "./RowTrailing";

const kindIcons = {
  pdf: {
    ios: "doc.richtext.fill",
    android: "picture_as_pdf",
    web: "picture_as_pdf",
  },
  text: {
    ios: "doc.plaintext.fill",
    android: "description",
    web: "description",
  },
} as const;

export function DocumentRow({
  document,
  editing,
  onRemove,
}: {
  document: LibraryDocument;
  editing: boolean;
  onRemove: () => void;
}) {
  const colors = useTheme();
  const accent = document.kind === "pdf" ? colors.error : colors.accentBlue;

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
        style={[styles.tile, { backgroundColor: withAlpha(accent, 0.12) }]}
      >
        <SymbolView name={kindIcons[document.kind]} size={20} tintColor={accent} />
      </View>
      <View style={styles.body}>
        <ThemedText type="smallBold" style={styles.title} numberOfLines={1}>
          {document.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary" style={styles.meta}>
          {`${formatMegabytes(document.sizeMb)} · ${formatLibraryDate(document.addedAt)}`}
        </ThemedText>
      </View>
      <RowTrailing name={document.name} editing={editing} onRemove={onRemove} />
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
