import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet } from "react-native";

import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function RowTrailing({
  name,
  editing,
  onRemove,
}: {
  name: string;
  editing: boolean;
  onRemove: () => void;
}) {
  const colors = useTheme();
  const { t } = useTranslation();

  if (editing) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t("library.removeFromDevice", { name })}
        onPress={onRemove}
        style={({ pressed }) => [styles.button, pressed && styles.pressed]}
      >
        <SymbolView
          name={{
            ios: "minus.circle.fill",
            android: "do_not_disturb_on",
            web: "do_not_disturb_on",
          }}
          size={24}
          tintColor={colors.error}
        />
      </Pressable>
    );
  }

  return (
    <Pressable
      disabled
      accessibilityRole="button"
      accessibilityLabel={t("library.moreOptions", { name })}
      accessibilityState={{ disabled: true }}
      style={[styles.button, styles.unavailable]}
    >
      <SymbolView
        name={{
          ios: "ellipsis",
          android: "more_vert",
          web: "more_vert",
        }}
        size={20}
        tintColor={colors.textSecondary}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 40,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  unavailable: { opacity: 0.45 },
  pressed: { opacity: 0.6 },
});
