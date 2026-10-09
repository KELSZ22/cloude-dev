import { StyleSheet, View } from "react-native";

import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { ONBOARDING_STEPS } from "@/shared/stores/onboarding-store";

/** Every step after the splash gets a dot, so the count stays true as the flow grows. */
export const ONBOARDING_DOTS = ONBOARDING_STEPS.length - 1;

export function StepDots({ total, index }: { total: number; index: number }) {
  const colors = useTheme();
  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: index + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: i === index ? 10 : 8,
              height: i === index ? 10 : 8,
              backgroundColor: i === index ? colors.tint : colors.disabled,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  dot: { height: 8, borderRadius: 999 },
});
