import { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { IntroStep } from "./components/IntroStep";
import { PreferencesStep } from "./components/PreferencesStep";
import { WelcomeStep } from "./components/WelcomeStep";

export default function OnboardingPage() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
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
            title={t("onboarding.companionTitle")}
            body={t("onboarding.companionBody")}
          />
        ) : null}
        {step === "intro2" ? (
          <IntroStep
            scene="explore"
            dotIndex={1}
            title={t("onboarding.exploreTitle")}
            body={t("onboarding.exploreBody")}
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
