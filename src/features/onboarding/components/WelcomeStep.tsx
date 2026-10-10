import { Image } from "expo-image";
import { useCallback, useEffect, useRef } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { SPLASH_HOLD_MS } from "./OnboardingStage";

export function WelcomeStep({ exiting = false }: { exiting?: boolean }) {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const next = useOnboardingStore((state) => state.next);
  const reducedMotion = useReducedMotion();
  const scale = useSharedValue(1);
  const advanced = useRef(false);

  const advance = useCallback(() => {
    if (advanced.current) return;
    advanced.current = true;
    next();
  }, [next]);

  useEffect(() => {
    const timer = setTimeout(advance, SPLASH_HOLD_MS);
    return () => clearTimeout(timer);
  }, [advance]);

  useEffect(() => {
    if (reducedMotion) return;
    // The picture leans in while the wordmark stays put, then leans a little more as it fades.
    scale.value = withTiming(exiting ? 1.08 : 1.045, {
      duration: exiting ? 640 : SPLASH_HOLD_MS,
      easing: exiting ? Easing.in(Easing.cubic) : Easing.out(Easing.quad),
    });
  }, [exiting, reducedMotion, scale]);

  const pictureStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={t("onboarding.continueOnboarding")}
      onPress={advance}
      style={styles.screen}
    >
      <Animated.View style={[StyleSheet.absoluteFill, pictureStyle]}>
        <Image
          source={require("@/assets/splash/splash.webp")}
          accessible={false}
          accessibilityLabel=""
          contentFit="cover"
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <View
        accessible
        accessibilityLabel="Seekora"
        style={[styles.brand, { paddingTop: insets.top + Spacing.five }]}
      >
        <Image
          source={require("@/assets/logo/logo-greenbg.webp")}
          contentFit="contain"
          accessible={false}
          accessibilityLabel=""
          style={styles.logo}
        />
        <Image
          source={require("@/assets/logo/Seekora-textlogo-light.webp")}
          contentFit="contain"
          accessible={false}
          accessibilityLabel=""
          style={styles.wordmark}
        />
        <ThemedText style={styles.tagline}>{t("onboarding.tagline")}</ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    overflow: "hidden",
  },
  brand: {
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  logo: {
    width: 72,
    height: 72,
    borderRadius: 20,
  },
  wordmark: {
    width: 220,
    height: 56,
  },
  tagline: {
    textAlign: "center",
    color: Colors.light.brand,
    textShadowColor: Colors.light.backgroundElement,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
