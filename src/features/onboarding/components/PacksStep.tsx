import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ModelDownloadStrip } from "@/shared/components/model-download-strip";
import { StateFigure } from "@/shared/components/state-figure";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { topicLabelKey } from "@/shared/constants/topics";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { ARTICLES_PER_TOPIC, useTopicPackStore } from "@/shared/stores/topic-pack-store";
import { SetupStep } from "./SetupStep";

export function PacksStep() {
  const colors = useTheme();
  const { t } = useTranslation();
  const complete = useOnboardingStore((state) => state.complete);
  const topics = useOnboardingStore((state) => state.topics);
  const preparing = useTopicPackStore((state) => state.preparing);
  const activeTopic = useTopicPackStore((state) => state.activeTopic);
  const articleIds = useTopicPackStore((state) => state.articleIds);
  const savedInTopic = useTopicPackStore((state) => state.savedInTopic);
  const error = useTopicPackStore((state) => state.error);
  const ensure = useTopicPackStore((state) => state.ensure);
  const [pendingStart, setPendingStart] = useState(topics.length > 0);

  useEffect(() => {
    if (!topics.length) {
      setPendingStart(false);
      return;
    }
    let active = true;
    setPendingStart(true);
    void ensure(topics).finally(() => {
      if (active) setPendingStart(false);
    });
    return () => {
      active = false;
    };
  }, [ensure, topics]);

  const savedArticles = topics.reduce(
    (total, topic) => total + Math.min(ARTICLES_PER_TOPIC, articleIds[topic]?.length ?? 0),
    0,
  );
  const articleTarget = topics.length * ARTICLES_PER_TOPIC;
  const downloading = topics.length > 0 && (preparing || pendingStart);

  function finish() {
    if (downloading) return;
    complete();
  }

  return (
    <SetupStep
      dotIndex={4}
      title={t("onboarding.packsTitle")}
      body={t("onboarding.packsBody")}
      primaryLabel={downloading ? t("onboarding.packsDownloading") : t("onboarding.packsFinish")}
      onPrimary={finish}
      primaryDisabled={downloading}
    >
      <View style={styles.loading}>
        <ModelDownloadStrip />
        {downloading ? (
          <ActivityIndicator color={colors.tint} accessibilityLabel={t("onboarding.packsDownloading")} />
        ) : null}
        <StateFigure
          tone={downloading ? "active" : savedArticles > 0 ? "done" : "cost"}
          label={downloading ? t("onboarding.packsDownloading") : undefined}
          value={savedArticles.toString()}
          unit={t("onboarding.passages")}
          caption={
            downloading && activeTopic
              ? t("library.packPreparing", {
                  topic: t(topicLabelKey[activeTopic]),
                  count: savedInTopic,
                  total: ARTICLES_PER_TOPIC,
                })
              : t("onboarding.packsCaption")
          }
          progress={articleTarget > 0 ? savedArticles / articleTarget : null}
        />
      </View>
      {error ? (
        <View style={styles.errorRow}>
          <ThemedText type="small" accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${error}`)}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => void ensure(topics)} style={styles.retry}>
            <ThemedText type="smallBold" themeColor="tint">{t("reading.retry")}</ThemedText>
          </Pressable>
        </View>
      ) : null}
      <ThemedText type="small" themeColor="textSecondary">
        {t("onboarding.packsLater")}
      </ThemedText>
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  loading: { gap: Spacing.three, marginBottom: Spacing.three },
  errorRow: { gap: Spacing.two, marginBottom: Spacing.three },
  retry: { alignSelf: "flex-start" },
});
