import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { ThemedText } from "./themed-text";

export function ActionButton({
  label,
  onPress,
  disabled = false,
  destructive = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  destructive?: boolean;
}) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  const idleColor = destructive ? colors.error : colors.tint;
  const isPressed = pressed && !disabled && !destructive;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        styles.button,
        {
          borderColor: disabled
            ? colors.disabled
            : isPressed
              ? colors.tintPressed
              : idleColor,
          backgroundColor: isPressed
            ? colors.tintPressed
            : colors.backgroundElement,
        },
      ])}
    >
      <ThemedText
        style={{
          color: disabled
            ? colors.disabled
            : isPressed
              ? colors.backgroundElement
              : idleColor,
        }}
      >
        {label}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 12,
    padding: Spacing.three,
    justifyContent: "center",
  },
});
