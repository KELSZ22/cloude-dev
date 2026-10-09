import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/shared/components/themed-text";
import { Fonts, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

/**
 * The one number these screens are really about: what this choice puts on the phone. It keeps its
 * place and its size as the meaning changes, so the figure the user weighed becomes the figure
 * they watch, and then the confirmation that it is theirs.
 */
export function SetupFigure({
  value,
  unit,
  caption,
  progress,
  tone,
}: {
  value: string;
  unit?: string;
  caption: string;
  /** Fraction of the work done, or null when nothing is running. */
  progress: number | null;
  tone: "cost" | "active" | "done";
}) {
  const colors = useTheme();
  const reducedMotion = useReducedMotion();
  const fill = useSharedValue(progress ?? 0);

  useEffect(() => {
    const target = progress ?? 0;
    fill.value = reducedMotion
      ? target
      : withTiming(target, { duration: 240, easing: Easing.out(Easing.quad) });
  }, [fill, progress, reducedMotion]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.value * 100}%` }));
  const figureColor = tone === "cost" ? colors.text : colors.tint;

  return (
    <View style={styles.figure}>
      <View style={styles.line}>
        {tone === "done" ? (
          // Sits on the row's centre line, since an icon has no baseline to share with the text.
          <View style={styles.badge}>
            <SymbolView
              name={{ ios: "checkmark.circle.fill", android: "check_circle", web: "check_circle" }}
              size={30}
              tintColor={colors.tint}
            />
          </View>
        ) : null}
        <ThemedText style={[styles.value, { color: figureColor }]}>{value}</ThemedText>
        {unit ? (
          <ThemedText themeColor="textSecondary" style={styles.unit}>
            {unit}
          </ThemedText>
        ) : null}
      </View>
      <ThemedText type="small" themeColor="textSecondary">
        {caption}
      </ThemedText>
      {progress !== null ? (
        <View style={[styles.track, { backgroundColor: colors.backgroundSelected }]}>
          <Animated.View
            style={[styles.fill, { backgroundColor: colors.tint }, fillStyle]}
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  figure: { gap: Spacing.one },
  line: { flexDirection: "row", alignItems: "baseline", gap: Spacing.two },
  badge: { alignSelf: "center" },
  value: {
    fontFamily: Fonts.bold,
    fontWeight: "normal",
    fontSize: 44,
    lineHeight: 50,
    letterSpacing: -1,
  },
  unit: { fontSize: 17, lineHeight: 24 },
  track: { height: 4, borderRadius: 999, overflow: "hidden", marginTop: Spacing.two },
  fill: { height: 4, borderRadius: 999 },
});
