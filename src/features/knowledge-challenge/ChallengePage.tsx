import { router, useLocalSearchParams } from "expo-router";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { PillButton } from "@/shared/components/pill-button";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
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
import { OPTION_LETTERS } from "./data/questions";
import {
  useChallengeDeck,
  useChallengeRun,
  useModelQuestions,
  useQuestionImage,
} from "./hooks";

export default function ChallengePage() {
  const insets = useSafeAreaInsets();
  const colors = useTheme();
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ review?: string; seconds?: string }>();
  const reviewAnswers = params.review
    ? params.review.split(",").map(Number)
    : null;
  const deck = useChallengeDeck();
  const run = useChallengeRun(deck.questions, reviewAnswers);
  useModelQuestions(deck.starter);
  const image = useQuestionImage(run.question.readingId, run.question.imageId);

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

  if (deck.building && !reviewAnswers) {
    return (
      <ThemedView type="backgroundElement" style={styles.screen}>
        <View style={[styles.frame, { paddingTop: insets.top + Spacing.one }]}>
          <ChallengeHeader
            title={t("challenge.title")}
            onBack={() =>
              router.canGoBack() ? router.back() : router.replace("/(tabs)")
            }
          />
        </View>
        <View style={styles.waiting} accessibilityRole="progressbar">
          <ActivityIndicator color={colors.tint} />
          <ThemedText type="subtitle" style={styles.waitingTitle}>
            {t("challenge.building")}
          </ThemedText>
          <ThemedText type="small" themeColor="textSecondary" style={styles.waitingBody}>
            {t("challenge.buildingBody")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const question = run.question;

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
        <TopicChip label={question.source} icon={question.icon} />
        <QuestionBanner
          icon={question.icon}
          label={t("challenge.illustration", { topic: question.source })}
          image={image}
        />
        <ThemedText
          type="subtitle"
          accessibilityRole="header"
          style={styles.prompt}
        >
          {question.promptKey ? t(question.promptKey) : question.prompt}
        </ThemedText>
        {question.excerpt ? (
          <View
            accessibilityLabel={`${t("challenge.excerptLabel")}: ${question.excerpt}`}
            style={[
              styles.excerpt,
              { backgroundColor: colors.backgroundSelected, borderColor: colors.tint },
            ]}
          >
            <ThemedText style={styles.excerptText}>{question.excerpt}</ThemedText>
          </View>
        ) : null}
        <View
          accessibilityRole="radiogroup"
          accessibilityLabel={t("challenge.choices")}
          style={styles.options}
        >
          {question.options.map((option, index) => (
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
        {deck.starter ? (
          <View style={styles.note}>
            <ThemedText type="small" themeColor="textSecondary" style={styles.noteText}>
              {t("challenge.starterNote")}
            </ThemedText>
            <PillButton
              label={t("challenge.starterAction")}
              variant="outline"
              onPress={() => router.replace("/(tabs)")}
            />
          </View>
        ) : (
          <HintStrip pack={question.source} fromArticle />
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.three }]}>
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
  waiting: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  waitingTitle: { fontSize: 18, lineHeight: 24, textAlign: "center" },
  waitingBody: { textAlign: "center", maxWidth: 320 },
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
  excerpt: {
    borderLeftWidth: 3,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  excerptText: { fontSize: 15, lineHeight: 23 },
  options: { gap: Spacing.two },
  note: { gap: Spacing.two },
  noteText: { fontSize: 12, lineHeight: 17 },
  footer: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
});
