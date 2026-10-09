import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function SectionHeader({
  title,
  editing,
  onToggleEdit,
}: {
  title: string;
  editing?: boolean;
  onToggleEdit?: () => void;
}) {
  const colors = useTheme();
  const { t } = useTranslation();

  return (
    <View style={styles.row}>
      <ThemedText
        type="smallBold"
        accessibilityRole="header"
        style={styles.title}
      >
        {title}
      </ThemedText>
      {onToggleEdit ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            editing
              ? t("library.finishEditing", { title })
              : t("library.editSection", { title })
          }
          onPress={onToggleEdit}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold" style={{ color: colors.tint }}>
            {editing ? t("common.done") : t("common.edit")}
          </ThemedText>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 36,
  },
  title: { fontSize: 15, lineHeight: 20 },
  action: {
    minHeight: 36,
    justifyContent: "center",
    paddingLeft: Spacing.three,
  },
  pressed: { opacity: 0.6 },
});
