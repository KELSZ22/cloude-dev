import { SymbolView } from "expo-symbols";
import { Alert, Linking, Pressable, StyleSheet, View } from "react-native";

import { ActionRow } from "@/shared/components/action-row";
import { InfoRow } from "@/shared/components/info-row";
import { PillButton } from "@/shared/components/pill-button";
import { RowGroup } from "@/shared/components/row-group";
import { StackPage } from "@/shared/components/stack-page";
import { StateFigure } from "@/shared/components/state-figure";
import { ThemedText } from "@/shared/components/themed-text";
import { localModel } from "@/shared/constants/local-model";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useModel } from "@/shared/providers/model-provider";

const megabytes = Math.round(localModel.sizeBytes / (1024 * 1024)).toString();

export default function ModelPage() {
  const colors = useTheme();
  const { t } = useTranslation();
  const model = useModel();

  const busy = model.operation !== null;
  const copying = model.operation === "preparing" || model.operation === "importing";
  const ready = model.state.status === "ready" || model.state.status === "generating";
  const installed = model.installed !== null;

  const working =
    model.operation === "importing" || model.operation === "verifying"
      ? t("model.checking", { percent: Math.round(model.progress * 100) })
      : model.operation === "preparing"
        ? t("model.preparing")
        : model.operation === "testing"
          ? t("model.testing")
          : model.operation === "answering"
            ? t("model.answering")
            : model.operation === "loading"
              ? t("model.loading")
              : model.operation === "choosing"
                ? t("model.choosing")
                : t("model.updating");

  // The figure answers one question: is the assistant ready, and what is it costing in storage?
  const figure = !model.native
    ? { label: t("model.stateUnavailable"), value: megabytes, unit: t("onboarding.megabytes"), caption: t("model.webBody"), tone: "cost" as const }
    : copying
      ? { label: t("model.stateSettingUp"), value: `${Math.round(model.progress * 100)}`, unit: "%", caption: working, tone: "active" as const }
      : ready
        ? { label: t("model.stateReady"), value: megabytes, unit: t("onboarding.megabytes"), caption: t("model.stateReadyBody"), tone: "done" as const }
        : installed
          ? { label: t("model.stateResting"), value: megabytes, unit: t("onboarding.megabytes"), caption: t("model.stateRestingBody"), tone: "cost" as const }
          : { label: t("model.stateMissing"), value: megabytes, unit: t("onboarding.megabytes"), caption: t("model.stateMissingBody"), tone: "cost" as const };

  function confirmRemove() {
    Alert.alert(t("model.removeTitle"), t("model.removeBody"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.remove"),
        style: "destructive",
        onPress: () => {
          void model.removeModel();
        },
      },
    ]);
  }

  function primary() {
    if (!installed) {
      if (model.hasBundled) return void model.setupBundledModel();
      return void model.importModel();
    }
    void model.loadModel();
  }

  const primaryLabel = !installed
    ? model.hasBundled
      ? t("onboarding.modelSetUp")
      : t("onboarding.modelChooseFile")
    : t("model.loadIntoMemory");

  return (
    <StackPage title={t("stack.onDeviceModel")}>
      <StateFigure
        label={figure.label}
        value={figure.value}
        unit={figure.unit}
        caption={figure.caption}
        tone={figure.tone}
        progress={copying ? model.progress : null}
      />

      {model.error ? (
        <ThemedText type="small" themeColor="error" accessibilityRole="alert">
          {model.error}
        </ThemedText>
      ) : null}

      {ready ? null : (
        <PillButton
          label={busy ? t("model.working") : primaryLabel}
          onPress={primary}
          disabled={busy || !model.native}
        />
      )}
      {busy ? (
        <PillButton
          label={t("common.cancel")}
          variant="outline"
          onPress={() => {
            void model.cancel();
          }}
          disabled={
            model.operation === "restoring" ||
            model.operation === "preparing" ||
            model.operation === "removing" ||
            model.operation === "unloading"
          }
        />
      ) : null}

      <RowGroup>
        <InfoRow
          first
          icon={{ ios: "cpu", android: "memory", web: "memory" }}
          label={t("model.rowModel")}
          value={localModel.name}
        />
        <InfoRow
          icon={{ ios: "internaldrive", android: "storage", web: "storage" }}
          label={t("model.rowStorage")}
          value={`${megabytes} ${t("onboarding.megabytes")}`}
        />
        <InfoRow
          icon={{ ios: "doc.text", android: "description", web: "description" }}
          label={t("model.rowLicence")}
          value={localModel.license}
        />
      </RowGroup>

      <RowGroup>
        <ActionRow
          first
          icon={{ ios: "play.circle", android: "play_circle", web: "play_circle" }}
          label={t("model.rowTest")}
          onPress={() => {
            void model.testModel();
          }}
          disabled={busy || !ready}
        />
        <ActionRow
          icon={{ ios: "pause.circle", android: "pause_circle", web: "pause_circle" }}
          label={t("model.rowUnload")}
          onPress={() => {
            void model.unloadModel();
          }}
          disabled={busy || !installed || !ready}
        />
        <ActionRow
          icon={{ ios: "trash", android: "delete", web: "delete" }}
          label={t("model.rowRemove")}
          destructive
          onPress={confirmRemove}
          disabled={busy || !model.native || !installed}
        />
      </RowGroup>

      {model.output !== "" ? (
        <View style={[styles.output, { borderColor: colors.border, backgroundColor: colors.backgroundSelected }]}>
          <ThemedText type="smallBold">{t("model.testTitle")}</ThemedText>
          <ThemedText type="small" selectable>
            {model.output}
          </ThemedText>
        </View>
      ) : null}

      {!installed && !model.hasBundled && model.native ? (
        <Pressable
          accessibilityRole="link"
          onPress={() => {
            void Linking.openURL(localModel.downloadUrl);
          }}
          style={styles.link}
        >
          <SymbolView
            name={{ ios: "arrow.down.circle", android: "download", web: "download" }}
            size={17}
            tintColor={colors.tint}
          />
          <ThemedText type="smallBold" themeColor="tint">
            {t("model.openDownload")}
          </ThemedText>
        </Pressable>
      ) : null}

      <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
        {t("model.privacyNote")}
      </ThemedText>
    </StackPage>
  );
}

const styles = StyleSheet.create({
  output: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.one },
  link: { flexDirection: "row", alignItems: "center", gap: Spacing.one, minHeight: 44 },
  note: { fontSize: 12, lineHeight: 17, paddingHorizontal: Spacing.one },
});
