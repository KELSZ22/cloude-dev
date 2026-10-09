import { Image } from "expo-image";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import Animated, {
  FadeIn,
  FadeInDown,
  ZoomIn,
  useReducedMotion,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { PillButton } from "@/shared/components/pill-button";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import {
  ChallengeHeader,
  ProgressRail,
  ResultStats,
  type RailSegment,
  type ResultStat,
} from "./components";
import { challengeQuestions } from "./data/questions";
import { useCountUp } from "./hooks";

const tiers = [
  {
    floor: 0.8,
    headline: "challenge.greatJob",
    art: require("@/assets/results/celebration.png"),
    label: "challenge.artCheer",
  },
  {
    floor: 0.5,
    headline: "challenge.goodEffort",
    art: require("@/assets/results/noresult.png"),
    label: "challenge.artThink",
  },
  {
    floor: 0,
    headline: "challenge.keepExploring",
    art: require("@/assets/results/error.png"),
    label: "challenge.artPuzzle",
  },
] as const satisfies readonly {
  floor: number;
  headline: MessageKey;
  art: number;
  label: MessageKey;
}[];

function formatDuration(
  seconds: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  if (!minutes) return t("challenge.seconds", { count: rest });
  return t("challenge.minutesSeconds", { minutes, seconds: rest });
}

export default function QuizResultPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const params = useLocalSearchParams<{ answers?: string; seconds?: string }>();

  const answers = params.answers
    ? params.answers.split(",").map(Number)
    : null;

  useEffect(() => {
    if (!answers?.length) router.replace("/(tabs)/challenge");
  }, [answers?.length]);

  const total = challengeQuestions.length;
  const correct = (answers ?? []).filter(
    (answer, index) => answer === challengeQuestions[index]?.answer,
  ).length;
  const seconds = Number(params.seconds ?? 0);
  const animate = !reducedMotion;
  const shown = useCountUp(correct, animate);
  const tier = tiers.find((entry) => correct / total >= entry.floor) ?? tiers[2];

  const segments: RailSegment[] = challengeQuestions.map((question, index) =>
    answers?.[index] === question.answer ? "correct" : "wrong",
  );

  const stats: readonly ResultStat[] = [
    {
      id: "correct",
      icon: { ios: "checkmark", android: "check", web: "check" },
      accent: colors.tint,
      label: t("challenge.correct"),
      value: String(correct),
    },
    {
      id: "incorrect",
      icon: { ios: "xmark", android: "close", web: "close" },
      accent: colors.error,
      label: t("challenge.incorrect"),
      value: String(total - correct),
    },
    {
      id: "time",
      icon: { ios: "clock", android: "schedule", web: "schedule" },
      accent: colors.textSecondary,
      label: t("challenge.time"),
      value: formatDuration(seconds, t),
    },
  ];

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <LeafDecor width={140} />
      <View style={[styles.frame, { paddingTop: insets.top + Spacing.one }]}>
        <ChallengeHeader
          title={t("challenge.quizResult")}
          onBack={() => router.replace("/(tabs)")}
        />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: BottomTabInset + Spacing.four },
        ]}
      >
        <Animated.View entering={animate ? ZoomIn.duration(420) : undefined}>
          <Image
            source={tier.art}
            accessibilityLabel={t(tier.label)}
            contentFit="contain"
            style={styles.art}
          />
        </Animated.View>

        <Animated.View
          entering={animate ? FadeInDown.delay(140).duration(320) : undefined}
          style={styles.score}
        >
          <ThemedText
            type="title"
            accessibilityRole="header"
            style={styles.headline}
          >
            {t(tier.headline)}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            {t("challenge.youScored")}
          </ThemedText>
          <ThemedText
            type="title"
            style={[styles.tally, { color: colors.tint }]}
            accessibilityLabel={t("challenge.tallyLabel", { correct, total })}
          >
            {t("challenge.tally", { shown, total })}
          </ThemedText>
        </Animated.View>

        <Animated.View
          entering={animate ? FadeIn.delay(260).duration(320) : undefined}
          style={styles.railWrap}
        >
          <ProgressRail
            segments={segments}
            label={t("challenge.rail", { correct, total })}
          />
        </Animated.View>

        <ResultStats stats={stats} animate={animate} />

        <Animated.View
          entering={animate ? FadeIn.delay(600).duration(280) : undefined}
          style={styles.actions}
        >
          <PillButton
            label={t("challenge.review")}
            onPress={() =>
              router.replace({
                pathname: "/(tabs)/challenge",
                params: {
                  review: params.answers ?? "",
                  seconds: String(seconds),
                },
              })
            }
          />
          <PillButton
            label={t("challenge.tryAgain")}
            variant="outline"
            onPress={() => router.replace("/(tabs)/challenge")}
          />
        </Animated.View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: { width: "100%", maxWidth: 600, alignSelf: "center" },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    alignItems: "center",
    gap: Spacing.three,
  },
  art: { width: 260, maxWidth: "88%", aspectRatio: 1448 / 1086 },
  score: { alignItems: "center", gap: Spacing.one },
  headline: { fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  tally: { fontSize: 30, lineHeight: 36, letterSpacing: -0.3 },
  railWrap: { width: "100%" },
  actions: { width: "100%", gap: Spacing.two, marginTop: Spacing.one },
});
