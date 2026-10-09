import { router, useLocalSearchParams } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton } from "@/shared/components/pill-button";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { BottomTabInset, Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import {
  AnswerOption,
  ChallengeHeader,
  HintStrip,
  ProgressRail,
  QuestionBanner,
  TopicChip,
  type AnswerState,
} from "./components";
import { CHALLENGE_TOPIC, OPTION_LETTERS } from "./data/questions";
import { useChallengeRun } from "./hooks";

export default function ChallengePage() {
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ review?: string; seconds?: string }>();
  const reviewAnswers = params.review
    ? params.review.split(",").map(Number)
    : null;
  const run = useChallengeRun(reviewAnswers);

  function optionState(option: number): AnswerState {
    if (!run.revealed) return run.given === option ? "selected" : "idle";
    if (option === run.question.answer) {
      return run.given === option ? "correct" : "missed";
    }
    return run.given === option ? "wrong" : "idle";
  }

  function primaryLabel() {
    if (!run.revealed) return t("challenge.check");
    if (run.reviewing) {
      return run.isLast ? t("challenge.backToResults") : t("challenge.next");
    }
    return run.isLast ? t("challenge.results") : t("challenge.next");
  }

  function onPrimary() {
    if (!run.revealed) {
      run.reveal();
      return;
    }
    if (!run.isLast) {
      run.advance();
      return;
    }
    const answers = run.reviewing
      ? (reviewAnswers?.join(",") ?? "")
      : run.answers.join(",");
    router.replace({
      pathname: "/(tabs)/challenge/result",
      params: {
        answers,
        seconds: run.reviewing
          ? (params.seconds ?? "0")
          : String(run.elapsedSeconds()),
      },
    });
  }

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <View style={[styles.frame, { paddingTop: insets.top + Spacing.one }]}>
        <ChallengeHeader
          title={run.reviewing ? t("challenge.review") : t("challenge.title")}
          onBack={() =>
            router.canGoBack() ? router.back() : router.replace("/(tabs)")
          }
          trailing={
            <ThemedText type="smallBold" themeColor="textSecondary">
              {`${run.index + 1}/${run.total}`}
            </ThemedText>
          }
        />
        <View style={styles.railWrap}>
          <ProgressRail
            segments={run.segments}
            label={t("challenge.progress", {
              current: run.index + 1,
              total: run.total,
            })}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <TopicChip label={CHALLENGE_TOPIC} />
        <QuestionBanner
          icon={run.question.icon}
          label={t("challenge.illustration", { topic: CHALLENGE_TOPIC })}
        />
        <ThemedText
          type="subtitle"
          accessibilityRole="header"
          style={styles.prompt}
        >
          {run.question.prompt}
        </ThemedText>
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("challenge.choices")}
          style={styles.options}
        >
          {run.question.options.map((option, index) => (
            <AnswerOption
              key={option}
              letter={OPTION_LETTERS[index]}
              label={option}
              state={optionState(index)}
              locked={run.revealed}
              onPress={() => run.select(index)}
            />
          ))}
        </View>
        <HintStrip pack={run.question.pack} />
      </ScrollView>

      <View
        style={[
          styles.footer,
          { paddingBottom: BottomTabInset + Spacing.two },
        ]}
      >
        <PillButton
          label={primaryLabel()}
          onPress={onPrimary}
          disabled={!run.revealed && run.given === null}
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  frame: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    gap: Spacing.two,
  },
  railWrap: { paddingHorizontal: Spacing.three },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.three,
    gap: 12,
  },
  prompt: { fontSize: 19, lineHeight: 26, letterSpacing: -0.2 },
  options: { gap: Spacing.two },
  footer: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
