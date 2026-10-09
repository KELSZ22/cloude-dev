import { router } from "expo-router";
import { SymbolView } from "expo-symbols";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import { useOnboardingStore, type OnboardingTopicId } from "@/shared/stores/onboarding-store";
import {
  ARTICLES_PER_TOPIC,
  useTopicPackStore,
} from "@/shared/stores/topic-pack-store";

const topicLabelKey = {
  general: "topics.general",
  science: "topics.science",
  technology: "topics.technology",
  history: "topics.history",
  health: "topics.health",
  business: "topics.business",
  arts: "topics.arts",
  environment: "topics.environment",
} as const satisfies Record<OnboardingTopicId, MessageKey>;

export function TopicPackShelf({ query = "" }: { query?: string }) {
  const { t } = useTranslation();
  const colors = useTheme();
  const topics = useOnboardingStore((state) => state.topics);
  const topicsReady = useOnboardingStore((state) => state.hasHydrated);
  const items = useOfflineReadingStore((state) => state.items);
  const articleIds = useTopicPackStore((state) => state.articleIds);
  const preparing = useTopicPackStore((state) => state.preparing);
  const activeTopic = useTopicPackStore((state) => state.activeTopic);
  const savedInTopic = useTopicPackStore((state) => state.savedInTopic);
  const error = useTopicPackStore((state) => state.error);
  const ensure = useTopicPackStore((state) => state.ensure);
  const [openTopic, setOpenTopic] = useState<OnboardingTopicId | null>(null);
  const needle = query.trim().toLowerCase();

  useEffect(() => {
    if (!topicsReady || !topics.length) return;
    void ensure(topics);
  }, [ensure, topics, topicsReady]);

  const sections = topics.map((topic) => {
    const saved = (articleIds[topic] ?? [])
      .map((id) => items.find((item) => item.id === id))
      .filter((item) => item !== undefined)
      .filter((item) => `${item.title} ${item.summary}`.toLowerCase().includes(needle));
    return { topic, saved };
  }).filter((section) => !needle || section.saved.length);

  return (
    <View style={styles.shelf}>
      {preparing && activeTopic ? (
        <View style={styles.progress}>
          <ActivityIndicator color={colors.tint} />
          <ThemedText type="small" themeColor="textSecondary">
            {t("library.packPreparing", {
              topic: t(topicLabelKey[activeTopic]),
              count: savedInTopic,
              total: ARTICLES_PER_TOPIC,
            })}
          </ThemedText>
        </View>
      ) : null}
      {error ? (
        <View style={styles.section}>
          <ThemedText type="small" accessibilityRole="alert" style={{ color: colors.error }}>
            {t(`reading.errors.${error}`)}
          </ThemedText>
          <Pressable accessibilityRole="button" onPress={() => void ensure(topics)} style={styles.retry}>
            <ThemedText type="smallBold" themeColor="tint">{t("reading.retry")}</ThemedText>
          </Pressable>
        </View>
      ) : null}
      {!preparing && !sections.length ? (
        <ThemedText type="small" themeColor="textSecondary">
          {needle ? t("search.empty") : t("library.noPacksBody")}
        </ThemedText>
      ) : null}
      {sections.map((section) => {
        const expanded = needle.length > 0 || openTopic === section.topic;
        const label = t(topicLabelKey[section.topic]);
        return (
        <View key={section.topic} style={[styles.section, { borderColor: colors.dashboardBorder, backgroundColor: colors.backgroundElement }]}>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ expanded }}
            accessibilityLabel={label}
            onPress={() => setOpenTopic((current) => current === section.topic ? null : section.topic)}
            style={styles.header}
          >
            <View style={styles.headerText}>
              <ThemedText type="smallBold" accessibilityRole="header">{label}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {t("library.packReady", { count: section.saved.length })}
              </ThemedText>
            </View>
            <SymbolView
              name={{
                ios: expanded ? "chevron.up" : "chevron.down",
                android: expanded ? "expand_less" : "expand_more",
                web: expanded ? "expand_less" : "expand_more",
              }}
              size={20}
              tintColor={colors.textSecondary}
            />
          </Pressable>
          {expanded ? section.saved.map((item) => (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={t("reading.readTitle", { title: item.title })}
              onPress={() => router.push({ pathname: "/read/[id]", params: { id: item.id } })}
              style={[styles.card, { borderColor: colors.dashboardBorder }]}
            >
              <ThemedText type="subtitle">{item.title}</ThemedText>
              <ThemedText type="small" themeColor="tint">
                {item.figureCount ? t("reading.availableIllustrated") : t("reading.available")}
              </ThemedText>
              {item.summary ? (
                <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
                  {item.summary}
                </ThemedText>
              ) : null}
              <ThemedText type="small" themeColor="textSecondary">
                {t("reading.minutes", { count: item.readMinutes })}
              </ThemedText>
            </Pressable>
          )) : null}
        </View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shelf: { gap: Spacing.four },
  progress: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  section: {
    borderWidth: 1,
    borderRadius: 16,
    overflow: "hidden",
  },
  header: {
    minHeight: 64,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  headerText: { flex: 1, gap: 2 },
  retry: { minHeight: 44, justifyContent: "center", alignSelf: "flex-start" },
  card: {
    borderTopWidth: 1,
    padding: Spacing.three,
    gap: Spacing.two,
  },
});
