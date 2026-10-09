import {
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Colors, Spacing } from "@/shared/constants/theme";
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
  const { height, width } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const next = useOnboardingStore((state) => state.next);
  const skip = useOnboardingStore((state) => state.skip);
  const compact = height < 720;
  const frameWidth = Math.min(width, 430);
  // Crop spare sky on shorter screens while keeping the illustrated bottom edge.
  const artHeight = Math.min(
    frameWidth * (1255 / 941),
    Math.max(frameWidth * 1.05, height - insets.bottom - (compact ? 240 : 300)),
  );

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.art, { height: artHeight }]}>
          <MascotScene scene={scene} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip onboarding"
            onPress={skip}
            style={[styles.skip, { top: insets.top + Spacing.two }]}
          >
            <ThemedText type="smallBold" style={styles.skipLabel}>
              Skip
            </ThemedText>
          </Pressable>
        </View>
        <View style={[styles.copy, compact && styles.compactCopy]}>
          <ThemedText
            type="title"
            accessibilityRole="header"
            style={[styles.title, compact && styles.compactTitle]}
          >
            {title}
          </ThemedText>
          <ThemedText
            themeColor="textSecondary"
            style={[styles.body, compact && styles.compactBody]}
          >
            {body}
          </ThemedText>
        </View>
      </ScrollView>
      <View style={[styles.footer, compact && styles.compactFooter]}>
        <View style={styles.dots}>
          <StepDots total={3} index={dotIndex} />
        </View>
        <View style={styles.next}>
          <OnboardingNextButton onPress={next} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { flexGrow: 1 },
  skip: {
    position: "absolute",
    right: Spacing.three,
    minWidth: 56,
    minHeight: 44,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.85)",
  },
  skipLabel: { color: Colors.light.tint },
  art: {
    width: "100%",
  },
  copy: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
    gap: Spacing.three,
  },
  compactCopy: { paddingVertical: Spacing.two, gap: Spacing.two },
  title: {
    textAlign: "center",
    fontSize: 28,
    lineHeight: 34,
    letterSpacing: 0,
  },
  compactTitle: { fontSize: 24, lineHeight: 29 },
  body: {
    textAlign: "center",
    paddingHorizontal: Spacing.two,
  },
  compactBody: { fontSize: 14, lineHeight: 20 },
  footer: {
    minHeight: 96,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  compactFooter: { minHeight: 80, paddingVertical: Spacing.two },
  dots: { alignItems: "center" },
  next: { position: "absolute", right: Spacing.four },
});
