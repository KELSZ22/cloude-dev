import { useEffect, useRef, type ReactNode } from "react";
import { StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { Spacing } from "@/shared/constants/theme";
import type { OnboardingStep } from "@/shared/stores/onboarding-store";

/** How long the splash illustration leans in before it dissolves. Matches the splash hold. */
export const SPLASH_HOLD_MS = 2200;
const SPLASH_FADE_MS = 640;
const STEP_MS = 460;

const PADDED_STEPS = new Set<OnboardingStep>(["preferences", "model", "packs"]);

export type StepDirection = "forward" | "back";

/**
 * One onboarding step, kept mounted through its exit so the next step can show through.
 * The splash grows; every other step fades and settles a few pixels. Going back lifts
 * the other way, so the direction of the dissolve says whether you moved on or returned.
 */
export function OnboardingStage({
  step,
  exiting,
  direction,
  enter,
  onExited,
  children,
}: {
  step: OnboardingStep;
  exiting: boolean;
  direction: StepDirection;
  /** False for the step that is already on screen when onboarding opens. */
  enter: boolean;
  onExited: () => void;
  children: ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const onExitedRef = useRef(onExited);
  useEffect(() => {
    onExitedRef.current = onExited;
  }, [onExited]);

  const opacity = useSharedValue(enter ? 0 : 1);
  const translateY = useSharedValue(
    enter && !reducedMotion ? (direction === "forward" ? 18 : -18) : 0,
  );

  useEffect(() => {
    const finish = () => onExitedRef.current();
    const distance = reducedMotion ? 0 : 18;
    const rise = direction === "forward" ? distance : -distance;

    if (!exiting) {
      if (!enter) return;
      translateY.value = rise;
      opacity.value = withTiming(1, {
        duration: reducedMotion ? 160 : STEP_MS,
        easing: Easing.out(Easing.cubic),
      });
      translateY.value = withTiming(0, {
        duration: reducedMotion ? 160 : STEP_MS + 40,
        easing: Easing.out(Easing.cubic),
      });
      return;
    }

    const duration = reducedMotion ? 140 : step === "splash" ? SPLASH_FADE_MS : 340;
    opacity.value = withTiming(0, { duration, easing: Easing.out(Easing.quad) }, (finished) => {
      if (finished) runOnJS(finish)();
    });
    if (!reducedMotion && step !== "splash") {
      translateY.value = withTiming(direction === "forward" ? -14 : 14, {
        duration,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [direction, enter, exiting, opacity, reducedMotion, step, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return (
    <Animated.View
      pointerEvents={exiting ? "none" : "auto"}
      accessibilityElementsHidden={exiting}
      importantForAccessibility={exiting ? "no-hide-descendants" : "auto"}
      style={[StyleSheet.absoluteFill, { zIndex: exiting ? 2 : 1 }, animatedStyle]}
    >
      <View
        style={[
          StyleSheet.absoluteFill,
          {
            paddingTop: PADDED_STEPS.has(step) ? insets.top + Spacing.two : 0,
            paddingBottom: step === "splash" ? 0 : insets.bottom + Spacing.two,
          },
        ]}
      >
        {step !== "splash" ? <LeafDecor showRight={PADDED_STEPS.has(step)} /> : null}
        {children}
      </View>
    </Animated.View>
  );
}

