import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

type FilterChipsProps<T extends string> = {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
  trailing?: ReactNode;
};

export function FilterChips<T extends string>({ options, value, onChange, trailing }: FilterChipsProps<T>) {
  const colors = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={[
              styles.chip,
              {
                backgroundColor: selected ? colors.tint : colors.backgroundElement,
                borderColor: selected ? colors.tint : colors.dashboardBorder,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={{ color: selected ? colors.backgroundElement : colors.text }}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
      {trailing}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
  },
  chip: {
    minHeight: 36,
    paddingHorizontal: 16,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
