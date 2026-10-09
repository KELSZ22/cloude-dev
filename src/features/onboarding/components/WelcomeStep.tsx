import { Image } from "expo-image";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { BrandMark } from "./BrandMark";

export function WelcomeStep() {
  const insets = useSafeAreaInsets();
  const next = useOnboardingStore((state) => state.next);

  useEffect(() => {
    const timer = setTimeout(next, 2200);
    return () => clearTimeout(timer);
  }, [next]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Continue to onboarding"
      onPress={next}
      style={styles.screen}
    >
      <Image
        source={require("@/assets/splash/splash.jpg")}
        accessible={false}
        accessibilityLabel=""
        contentFit="cover"
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.brand, { paddingTop: insets.top + Spacing.five }]}>
        <BrandMark size={64} />
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          ARALSEARCH
        </ThemedText>
        <ThemedText style={styles.tagline}>
          {"Discover. Learn. Grow.\nAnywhere."}
        </ThemedText>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  brand: {
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  title: {
    textAlign: "center",
    color: Colors.light.brand,
    textShadowColor: Colors.light.backgroundElement,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
  tagline: {
    textAlign: "center",
    color: Colors.light.brand,
    textShadowColor: Colors.light.backgroundElement,
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 8,
  },
});
