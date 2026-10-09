import { Link, type Href } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";

import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { ThemedText } from "./themed-text";

export function NavigationButton({
  href,
  label,
}: {
  href: Href;
  label: string;
}) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Link href={href} asChild>
      <Pressable
        accessibilityRole="link"
        accessibilityLabel={label}
        onPressIn={() => setPressed(true)}
        onPressOut={() => setPressed(false)}
        style={StyleSheet.flatten([
          styles.button,
          {
            borderColor: pressed ? colors.tintPressed : colors.border,
            backgroundColor: pressed
              ? colors.tintPressed
              : colors.backgroundElement,
          },
        ])}
      >
        <ThemedText
          style={{ color: pressed ? colors.backgroundElement : colors.tint }}
        >
          {label}
        </ThemedText>
      </Pressable>
    </Link>
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
