import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

export function PillButton({
  label,
  onPress,
  variant = "solid",
  disabled = false,
  accessibilityLabel,
  icon,
}: {
  label: string;
  onPress: () => void;
  variant?: "solid" | "outline";
  disabled?: boolean;
  accessibilityLabel?: string;
  icon?: SymbolViewProps["name"];
}) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  const solid = variant === "solid";

  const background = disabled
    ? solid
      ? colors.disabled
      : "transparent"
    : solid
      ? pressed
        ? colors.tintPressed
        : colors.tint
      : pressed
        ? withAlpha(colors.tint, 0.12)
        : "transparent";

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        styles.button,
        {
          backgroundColor: background,
          borderColor: solid ? "transparent" : colors.tint,
          borderWidth: solid ? 0 : 1.5,
          opacity: disabled && !solid ? 0.5 : 1,
        },
      ])}
    >
      {icon ? (
        <SymbolView
          name={icon}
          size={18}
          tintColor={solid ? colors.backgroundElement : colors.tint}
        />
      ) : null}
      <ThemedText
        type="smallBold"
        style={[
          styles.label,
          { color: solid ? colors.backgroundElement : colors.tint },
        ]}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 999,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: Spacing.four,
  },
  label: { fontSize: 15, lineHeight: 20 },
});
