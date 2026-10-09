import { Pressable, ScrollView, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

export function FilterChips<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { id: T; label: string }[];
  value: T;
  onChange: (id: T) => void;
}) {
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
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            accessibilityLabel={option.label}
            onPress={() => onChange(option.id)}
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: selected ? colors.tint : colors.background,
                opacity: pressed ? 0.75 : 1,
              },
            ]}
          >
            <ThemedText
              type="smallBold"
              style={[
                styles.label,
                {
                  color: selected ? colors.backgroundElement : colors.text,
                },
              ]}
            >
              {option.label}
            </ThemedText>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: Spacing.two, paddingHorizontal: Spacing.three },
  chip: {
    minHeight: 34,
    borderRadius: 999,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  label: { fontSize: 13, lineHeight: 18 },
});
