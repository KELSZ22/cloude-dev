import { router } from "expo-router";
import { useEffect } from "react";
import { StyleSheet } from "react-native";

import { ActionRow } from "@/shared/components/action-row";
import { RowGroup } from "@/shared/components/row-group";
import { StackPage } from "@/shared/components/stack-page";
import { StateFigure } from "@/shared/components/state-figure";
import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTranslation } from "@/shared/i18n";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { useModel } from "@/shared/providers/model-provider";
import { useOfflineReadingStore } from "@/shared/stores/offline-reading-store";

export default function SetupPage() {
  const { t } = useTranslation();
  const knowledge = useKnowledge();
  const model = useModel();
  const readings = useOfflineReadingStore((store) => store.items);
  const hydrateReading = useOfflineReadingStore((store) => store.hydrate);
  useEffect(() => {
    void hydrateReading();
  }, [hydrateReading]);

  const library = knowledge.state;
  const ready = library.status === "ready";
  const passages = ready ? library.passages : 0;
  const packs = ready ? library.packs.length : 0;
  const problem =
    library.status === "unavailable"
      ? library.reason
      : library.status === "error"
        ? library.message
        : null;

  const modelReady = model.state.status === "ready" || model.state.status === "generating";
  const modelValue = !model.native
    ? t("setup.rowUnavailable")
    : modelReady
      ? t("settings.ready")
      : model.installed
        ? t("settings.installed")
        : t("settings.notInstalled");

  return (
    <StackPage title={t("setup.title")}>
      <StateFigure
        label={passages > 0 ? t("setup.stateReady") : t("setup.stateEmpty")}
        value={passages.toString()}
        unit={t("onboarding.passages")}
        caption={passages > 0 ? t("setup.stateReadyBody") : t("setup.stateEmptyBody")}
        tone={passages > 0 ? "done" : "cost"}
        progress={library.status === "opening" ? 0 : null}
      />

      {problem ? (
        <ThemedText type="small" themeColor="textSecondary">
          {problem}
        </ThemedText>
      ) : null}

      <RowGroup>
        <ActionRow
          first
          icon={{ ios: "books.vertical", android: "library_books", web: "library_books" }}
          label={t("setup.rowPacks")}
          value={t("setup.packCount", { count: packs })}
          onPress={() => router.navigate("/packs")}
        />
        <ActionRow
          icon={{ ios: "cpu", android: "memory", web: "memory" }}
          label={t("setup.rowModel")}
          value={modelValue}
          onPress={() => router.navigate("/model")}
        />
        <ActionRow
          icon={{ ios: "arrow.down.doc", android: "download_done", web: "download_done" }}
          label={t("setup.rowReadings")}
          value={t("setup.readingCount", { count: readings.length })}
          onPress={() =>
            router.navigate({ pathname: "/(tabs)/library", params: { shelf: "reading" } })
          }
        />
      </RowGroup>

      <RowGroup>
        <ActionRow
          first
          icon={{ ios: "magnifyingglass", android: "search", web: "search" }}
          label={t("setup.rowSearch")}
          onPress={() => router.navigate("/(tabs)/search")}
        />
      </RowGroup>

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        {t("setup.note")}
      </ThemedText>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: Spacing.one },
});
