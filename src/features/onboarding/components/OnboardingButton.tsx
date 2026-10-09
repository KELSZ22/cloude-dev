import { useState } from "react";
import { Pressable, StyleSheet } from "react-native";
import { SymbolView } from "expo-symbols";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function OnboardingButton({
  label,
  onPress,
  accessibilityLabel,
  disabled,
}: {
  label: string;
  onPress: () => void;
  accessibilityLabel?: string;
  disabled?: boolean;
}) {
  const colors = useTheme();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={StyleSheet.flatten([
        styles.full,
        {
          backgroundColor: disabled
            ? colors.disabled
            : pressed
              ? colors.tintPressed
              : colors.tint,
        },
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
  const { t } = useTranslation();
  const [pressed, setPressed] = useState(false);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("common.continue")}
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
