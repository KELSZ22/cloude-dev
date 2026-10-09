import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { topicIcon, topicLabelKey } from "@/shared/constants/topics";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";
import {
  ONBOARDING_TOPIC_IDS,
  useOnboardingStore,
  type OnboardingTopicId,
} from "@/shared/stores/onboarding-store";
import {
  ARTICLES_PER_TOPIC,
  useTopicPackStore,
} from "@/shared/stores/topic-pack-store";

function suggestedOrder(chosen: readonly OnboardingTopicId[]) {
  const picked = ONBOARDING_TOPIC_IDS.filter((id) => chosen.includes(id));
  const rest = ONBOARDING_TOPIC_IDS.filter((id) => !chosen.includes(id));
  return [...picked, ...rest];
}

export function SuggestedPacks() {
  const colors = useTheme();
  const { t } = useTranslation();
  const chosen = useOnboardingStore((state) => state.topics);
  const hydrate = useOfflineReadingStore((state) => state.hydrate);
  const readings = useOfflineReadingStore((state) => state.items);
  const articleIds = useTopicPackStore((state) => state.articleIds);
  const preparing = useTopicPackStore((state) => state.preparing);
  const activeTopic = useTopicPackStore((state) => state.activeTopic);
  const savedInTopic = useTopicPackStore((state) => state.savedInTopic);
  const error = useTopicPackStore((state) => state.error);
  const ensure = useTopicPackStore((state) => state.ensure);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const savedIds = new Set(readings.map((item) => item.id));
  const topics = suggestedOrder(chosen);

  return (
    <View style={styles.section}>
      <ThemedText type="subtitle" accessibilityRole="header" style={styles.title}>
        {t("home.suggestedForYou")}
      </ThemedText>
      <View
        style={[
          styles.group,
          { backgroundColor: colors.backgroundElement, borderColor: colors.dashboardBorder },
        ]}
      >
        {topics.map((topic, index) => {
          const saved = (articleIds[topic] ?? []).filter((id) => savedIds.has(id)).length;
          const complete = saved >= ARTICLES_PER_TOPIC;
          const active = preparing && activeTopic === topic;
          const shown = active ? savedInTopic : saved;
          const label = t(topicLabelKey[topic]);
          return (
            <View
              key={topic}
              style={[
                styles.row,
                index > 0 && { borderTopColor: colors.dashboardBorder, borderTopWidth: StyleSheet.hairlineWidth },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: colors.backgroundSelected }]}>
                <SymbolView name={topicIcon[topic]} size={20} tintColor={colors.tint} />
              </View>
              <View style={styles.copy}>
                <ThemedText type="smallBold">{label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {shown > 0
                    ? t("home.packProgress", { count: shown, total: ARTICLES_PER_TOPIC })
                    : t("home.packArticles", { count: ARTICLES_PER_TOPIC })}
                </ThemedText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={
                  complete
                    ? t("home.packSavedLabel", { topic: label })
                    : active
                      ? `${label}. ${t("home.packDownloading")}`
                      : t("home.packDownloadLabel", { topic: label })
                }
                accessibilityState={{ disabled: complete || preparing }}
                disabled={complete || preparing}
                onPress={() => void ensure([topic])}
                style={({ pressed }) => [
                  styles.action,
                  {
                    backgroundColor: complete ? colors.backgroundSelected : colors.tint,
                    opacity: pressed || (preparing && !active) ? 0.7 : 1,
                  },
                ]}
              >
                <ThemedText
                  type="smallBold"
                  style={{ color: complete ? colors.tint : colors.backgroundElement }}
                >
                  {complete
                    ? t("home.packSaved")
                    : active
                      ? t("home.packDownloading")
                      : t("home.packDownload")}
                </ThemedText>
              </Pressable>
            </View>
          );
        })}
      </View>
      {error ? (
        <ThemedText type="small" accessibilityRole="alert" style={{ color: colors.error }}>
          {t(`reading.errors.${error}`)}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { gap: 12, marginTop: Spacing.one },
  title: { fontSize: 18, lineHeight: 24 },
  group: { borderWidth: 1, borderRadius: 16, overflow: "hidden" },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    minHeight: 68,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: { flex: 1, gap: 2 },
  action: {
    minWidth: 96,
    minHeight: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
});
