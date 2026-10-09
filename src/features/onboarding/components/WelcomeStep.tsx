import { useEffect } from "react";
import { Pressable, StyleSheet } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { BrandMark } from "./BrandMark";
import { MascotScene } from "./MascotScene";

export function WelcomeStep() {
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
      <MascotScene scene="welcome" />
      <BrandMark size={72} />
      <ThemedText type="title" accessibilityRole="header" style={styles.title}>
        ARALSEARCH
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.tagline}>
        Discover. Learn. Grow. Anywhere.
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
  },
  title: { textAlign: "center" },
  tagline: { textAlign: "center" },
});
