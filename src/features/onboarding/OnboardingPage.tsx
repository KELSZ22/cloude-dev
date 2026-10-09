import { router } from "expo-router";
import { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";

import { ThemedView } from "@/shared/components/themed-view";
import { useTranslation } from "@/shared/i18n";
import {
  ONBOARDING_STEPS,
  useOnboardingStore,
  type OnboardingStep,
} from "@/shared/stores/onboarding-store";
import { IntroStep } from "./components/IntroStep";
import { ModelStep } from "./components/ModelStep";
import {
  OnboardingStage,
  type StepDirection,
} from "./components/OnboardingStage";
import { PacksStep } from "./components/PacksStep";
import { PreferencesStep } from "./components/PreferencesStep";
import { WelcomeStep } from "./components/WelcomeStep";

type Layer = {
  id: number;
  step: OnboardingStep;
  exiting: boolean;
  direction: StepDirection;
  enter: boolean;
};

function StepBody({
  step,
  exiting,
}: {
  step: OnboardingStep;
  exiting: boolean;
}) {
  const { t } = useTranslation();
  if (step === "splash") return <WelcomeStep exiting={exiting} />;
  if (step === "intro1") {
    return (
      <IntroStep
        scene="companion"
        dotIndex={0}
        title={t("onboarding.companionTitle")}
        body={t("onboarding.companionBody")}
      />
    );
  }
  if (step === "intro2") {
    return (
      <IntroStep
        scene="explore"
        dotIndex={1}
        title={t("onboarding.exploreTitle")}
        body={t("onboarding.exploreBody")}
      />
    );
  }
  if (step === "preferences") return <PreferencesStep />;
  if (step === "model") return <ModelStep />;
  return <PacksStep />;
}

export default function OnboardingPage() {
  const step = useOnboardingStore((state) => state.step);
  const completed = useOnboardingStore((state) => state.completed);
  const [layers, setLayers] = useState<Layer[]>(() => [
    { id: 0, step, exiting: false, direction: "forward", enter: false },
  ]);
  const [tracked, setTracked] = useState(step);

  // Keep the leaving step mounted until its dissolve finishes, so the next one shows through.
  if (step !== tracked) {
    setTracked(step);
    setLayers((current) => {
      const active = current.find((layer) => !layer.exiting);
      if (active?.step === step) return current;
      const from = ONBOARDING_STEPS.indexOf(active?.step ?? step);
      const to = ONBOARDING_STEPS.indexOf(step);
      const direction: StepDirection = to >= from ? "forward" : "back";
      const id = (current[current.length - 1]?.id ?? 0) + 1;
      return [
        ...current.map((layer) =>
          layer.exiting ? layer : { ...layer, exiting: true, direction },
        ),
        { id, step, exiting: false, direction, enter: true },
      ];
    });
  }

  useEffect(() => {
    if (completed) router.replace("/(tabs)");
  }, [completed]);

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <View style={styles.frame}>
        {layers.map((layer) => (
          <OnboardingStage
            key={layer.id}
            step={layer.step}
            exiting={layer.exiting}
            direction={layer.direction}
            enter={layer.enter}
            onExited={() =>
              setLayers((current) => current.filter((item) => item.id !== layer.id))
            }
          >
            <StepBody step={layer.step} exiting={layer.exiting} />
          </OnboardingStage>
        ))}
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
