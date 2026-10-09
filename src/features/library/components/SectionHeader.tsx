import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

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
            editing ? `Finish editing ${title}` : `Edit ${title}`
          }
          onPress={onToggleEdit}
          style={({ pressed }) => [styles.action, pressed && styles.pressed]}
        >
          <ThemedText type="smallBold" style={{ color: colors.tint }}>
            {editing ? "Done" : "Edit"}
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
