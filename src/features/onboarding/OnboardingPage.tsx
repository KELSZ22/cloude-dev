import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { IntroStep } from "./components/IntroStep";
import { LeafDecor } from "./components/LeafDecor";
import { PreferencesStep } from "./components/PreferencesStep";
import { WelcomeStep } from "./components/WelcomeStep";

export default function OnboardingPage() {
  const insets = useSafeAreaInsets();
  const step = useOnboardingStore((state) => state.step);
  const completed = useOnboardingStore((state) => state.completed);

  useEffect(() => {
    if (completed) router.replace("/(tabs)");
  }, [completed]);

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <View
        style={[
          styles.frame,
          {
            paddingTop: step === "preferences" ? insets.top + Spacing.two : 0,
            paddingBottom: step === "splash" ? 0 : insets.bottom + Spacing.two,
          },
        ]}
      >
        {step !== "splash" ? (
          <LeafDecor showRight={step === "preferences"} />
        ) : null}
        {step === "splash" ? <WelcomeStep /> : null}
        {step === "intro1" ? (
          <IntroStep
            scene="companion"
            dotIndex={0}
            title="Your Knowledge Companion"
            body="Search, explore, and learn with the power of AI — anytime, anywhere."
          />
        ) : null}
        {step === "intro2" ? (
          <IntroStep
            scene="explore"
            dotIndex={1}
            title="Explore a World of Knowledge"
            body="Access a wide range of topics through curated knowledge packs and your personal library."
          />
        ) : null}
        {step === "preferences" ? <PreferencesStep /> : null}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: {
    flex: 1,
    width: "100%",
    maxWidth: 430,
    alignSelf: "center",
    overflow: "hidden",
  },
});
