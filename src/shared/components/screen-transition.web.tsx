import type { ComponentType } from "react";
import { StyleSheet } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  FadeInRight,
  useReducedMotion,
} from "react-native-reanimated";

/** How a screen arrives, named after the native stack animation the same route uses. */
export type ScreenTransition = "push" | "fade" | "modal";

const DURATION = 240;

/**
 * Presets only. Reanimated implements these on web, but not custom layout animations or
 * `springify()`, so a hand-written entering worklet would silently do nothing here.
 */
function entering(transition: ScreenTransition) {
  if (transition === "fade") return FadeIn.duration(DURATION);
  // Both start 25px off and settle at 0: from the right for a push, from below for a modal.
  if (transition === "modal") return FadeInDown.duration(DURATION);
  return FadeInRight.duration(DURATION);
}

/**
 * Animates a screen on the way in, because native stack animations do not run in a browser.
 * There is no matching exit: the stack swaps screens instantly, so only the arrival can be shown.
 */
export function withScreenTransition<P extends object>(
  Screen: ComponentType<P>,
  transition: ScreenTransition = "push",
): ComponentType<P> {
  function TransitionedScreen(props: P) {
    const reducedMotion = useReducedMotion();

    return (
      <Animated.View
        style={styles.screen}
        entering={reducedMotion ? undefined : entering(transition)}
      >
        <Screen {...props} />
      </Animated.View>
    );
  }

  const name = Screen.displayName ?? Screen.name;
  TransitionedScreen.displayName = `WithScreenTransition(${name || "Screen"})`;
  return TransitionedScreen;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
});
