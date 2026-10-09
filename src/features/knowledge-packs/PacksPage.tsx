import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { knowledgePackById, knowledgePacks } from "@/features/library/catalog";
import { DownloadComplete } from "@/features/library/components/DownloadComplete";
import { DownloadView } from "@/features/library/components/DownloadView";
import { PackCard } from "@/shared/components/pack-card";
import { Page } from "@/shared/components/page";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { openStaxInitialResources } from "@/shared/content/openstax/initial-resources";
import { useTranslation } from "@/shared/i18n";
import { usePackDownloadStore } from "@/shared/stores/pack-download-store";

function formatCorpusSize(bytes: number) {
  const gb = bytes / 1024 ** 3;
  if (gb >= 1) return `${gb.toFixed(1)} GB`;
  return `${Math.round(bytes / 1024 ** 2)} MB`;
}

function formatMegabytesFromBytes(bytes: number) {
  return Math.max(0, Math.round(bytes / (1024 * 1024)));
}

export default function PacksPage() {
  const { t } = useTranslation();
  const {
    packId,
    progress,
    paused,
    installed,
    finishedId,
    error,
    downloadedBytes,
    totalBytes,
    speedBps,
    start,
    togglePause,
    cancel,
    dismissFinished,
    clearError,
  } = usePackDownloadStore();
  const verification = openStaxInitialResources.source.verification;

  const activePack = packId ? knowledgePackById(packId) : null;
  const finishedPack = finishedId ? knowledgePackById(finishedId) : null;

  if (finishedPack) {
    return (
      <Page nested title={t("stack.knowledgePacks")}>
        <DownloadComplete
          pack={finishedPack}
          onBack={dismissFinished}
          onExplore={dismissFinished}
          onViewLibrary={() => {
            dismissFinished();
            router.navigate("/(tabs)/library");
          }}
        />
      </Page>
    );
  }

  if (activePack) {
    const totalMb =
      totalBytes > 0 ? formatMegabytesFromBytes(totalBytes) : activePack.sizeMb;
    return (
      <Page nested title={t("stack.knowledgePacks")}>
        <DownloadView
          pack={activePack}
          progress={progress}
          paused={paused}
          downloadedMb={formatMegabytesFromBytes(downloadedBytes)}
          totalMb={totalMb}
          speedMbps={speedBps / (1024 * 1024)}
          onBack={cancel}
          onTogglePause={togglePause}
          onCancel={cancel}
        />
      </Page>
    );
  }

  return (
    <Page
      nested
      title={t("stack.knowledgePacks")}
      description={t("packs.description")}
    >
      <View style={styles.summary}>
        <ThemedText type="smallBold">{t("packs.corpusTitle")}</ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("packs.corpusBody", {
            books: verification.books,
            assets: verification.downloadedAssets,
            size: formatCorpusSize(verification.downloadedBytes),
          })}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("packs.inAppDownloadHint")}
        </ThemedText>
      </View>
      {error ? <PressableError message={error} onDismiss={clearError} /> : null}
      <ScrollView
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
      >
        {knowledgePacks.map((pack) => {
          const status = installed[pack.id]
            ? "installed"
            : packId === pack.id
              ? "downloading"
              : "ready";
          return (
            <PackCard
              key={pack.id}
              pack={pack}
              status={status}
              progress={packId === pack.id ? progress : 0}
              onPress={() => start(pack.id)}
            />
          );
        })}
      </ScrollView>
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
