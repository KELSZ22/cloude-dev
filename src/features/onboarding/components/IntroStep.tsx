import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { MascotScene } from "./MascotScene";
import { OnboardingNextButton } from "./OnboardingButton";
import { StepDots } from "./StepDots";

export function IntroStep({
  scene,
  title,
  body,
  dotIndex,
}: {
  scene: "companion" | "explore";
  title: string;
  body: string;
  dotIndex: number;
}) {
  const colors = useTheme();
  const next = useOnboardingStore((state) => state.next);
  const skip = useOnboardingStore((state) => state.skip);

  return (
    <View style={styles.screen}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Skip onboarding"
        onPress={skip}
        style={styles.skip}
      >
        <ThemedText type="smallBold" style={{ color: colors.tint }}>
          Skip
        </ThemedText>
      </Pressable>
      <View style={styles.art}>
        <MascotScene scene={scene} />
      </View>
      <ThemedText type="title" accessibilityRole="header" style={styles.title}>
        {title}
      </ThemedText>
      <ThemedText themeColor="textSecondary" style={styles.body}>
        {body}
      </ThemedText>
      <View style={styles.footer}>
        <StepDots total={3} index={dotIndex} />
        <OnboardingNextButton onPress={next} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    justifyContent: "space-between",
  },
  skip: {
    alignSelf: "flex-end",
    minHeight: 44,
    justifyContent: "center",
    zIndex: 2,
  },
  art: {
    flex: 1,
    minHeight: 180,
    maxHeight: 340,
    justifyContent: "center",
    overflow: "hidden",
  },
  title: { textAlign: "center", marginTop: Spacing.three },
  body: {
    textAlign: "center",
    marginTop: Spacing.two,
    paddingHorizontal: Spacing.two,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: Spacing.four,
  },
});
