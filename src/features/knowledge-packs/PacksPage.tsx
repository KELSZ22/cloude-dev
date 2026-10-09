import { KnowledgeStatus } from "@/shared/components/knowledge-status";
import { Page } from "@/shared/components/page";
import { StatusCard } from "@/shared/components/status-card";
import { ThemedText } from "@/shared/components/themed-text";
import { contentSources } from "@/shared/constants/content-sources";
import { Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { Redirect } from "expo-router";
import { Pressable, View } from "react-native";

export default function PacksPage() {
  return contentSources.openStax ? (
    <OpenStaxPacksPage />
  ) : (
    <Redirect href="/learn" />
  );
}

function OpenStaxPacksPage() {
  const { t } = useTranslation();
  const { state } = useKnowledge();
  const packs = state.status === "ready" ? state.packs : [];
  return (
    <Page
      nested
      title={t("stack.knowledgePacks")}
      description={t("packs.description")}
    >
      <KnowledgeStatus />
      {packs.map((pack) => (
        <StatusCard
          key={pack.id}
          title={pack.name}
          description={pack.description}
        >
          <ThemedText type="small">
            {t("packs.versionLine", {
              version: pack.version,
              language: pack.language,
            })}
          </ThemedText>
          <ThemedText type="small">
            {t("packs.author", { author: pack.author })}
          </ThemedText>
          <ThemedText type="small">
            {t("packs.origin", { source: pack.source })}
          </ThemedText>
          <ThemedText type="small">
            {t("packs.license", { license: pack.license })}
          </ThemedText>
        </StatusCard>
      ))}
      <StatusCard
        title={t("packs.moreTitle")}
        description={t("packs.moreBody")}
      />
    </Page>
  );
}

function PressableError({
  message,
  onDismiss,
}: {
  message: string;
  onDismiss: () => void;
}) {
  return (
    <View style={styles.error}>
      <ThemedText type="small" themeColor="textSecondary">
        {message}
      </ThemedText>
      <Pressable accessibilityRole="button" onPress={onDismiss}>
        <ThemedText type="smallBold" style={styles.dismiss}>
          Dismiss
        </ThemedText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  summary: { gap: Spacing.one, marginBottom: Spacing.two },
  list: { gap: Spacing.two, paddingBottom: Spacing.four },
  error: {
    gap: Spacing.one,
    marginBottom: Spacing.two,
    padding: Spacing.two,
    borderRadius: 12,
  },
  dismiss: { alignSelf: "flex-start" },
});
