import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

export function OnboardingButton({
  label,
  onPress,
  accessibilityLabel,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
}) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        styles.full,
        { backgroundColor: pressed ? colors.tintPressed : colors.tint },
      ])}
    >
      <ThemedText type="smallBold" style={{ color: colors.backgroundElement }}>
        {label}
      </ThemedText>
    </Pressable>
  );
}

export function OnboardingNextButton({ onPress }: { onPress: () => void }) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue"
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        styles.circle,
        { backgroundColor: pressed ? colors.tintPressed : colors.tint },
      ])}
    >
      <SymbolView
        name={{
          ios: "arrow.right",
          android: "arrow_forward",
          web: "arrow_forward",
        }}
        size={22}
        tintColor={colors.backgroundElement}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  full: {
    minHeight: 52,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
  },
  circle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
  },
});
