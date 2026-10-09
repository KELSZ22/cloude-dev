import { StyleSheet, View } from "react-native";

import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

export type RailSegment = "answered" | "current" | "upcoming" | "correct" | "wrong";

/**
 * Ten stops on one run through a pack, shown as a trail. The same rail returns
 * on the result screen so a score reads as the route that was just walked.
 */
export function ProgressRail({
  segments,
  label,
}: {
  segments: readonly RailSegment[];
  label: string;
}) {
  const colors = useTheme();

  const fill: Record<RailSegment, string> = {
    answered: colors.tint,
    correct: colors.tint,
    wrong: colors.error,
    current: withAlpha(colors.tint, 0.4),
    upcoming: colors.border,
  };

  return (
    <View
      accessible
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={styles.rail}
    >
      {segments.map((segment, index) => (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor: fill[segment],
              height: segment === "current" ? 8 : 6,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.one,
    minHeight: 8,
  },
  segment: { flex: 1, borderRadius: 999 },
});
