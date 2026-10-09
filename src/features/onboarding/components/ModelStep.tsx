import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { StateFigure } from "@/shared/components/state-figure";
import { ThemedText } from "@/shared/components/themed-text";
import { localModel } from "@/shared/constants/local-model";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useModel } from "@/shared/providers/model-provider";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { SetupStep } from "./SetupStep";

const FACTS: MessageKey[] = [
  "onboarding.modelFactOffline",
  "onboarding.modelFactPrivate",
  "onboarding.modelFactRemovable",
];

const megabytes = Math.round(localModel.sizeBytes / 1_000_000);

export function ModelStep() {
  const colors = useTheme();
  const { t } = useTranslation();
  const next = useOnboardingStore((state) => state.next);
  const model = useModel();

  const busy = model.operation !== null;
  const downloading = model.operation === "downloading";
  const verifying = model.operation === "importing" || model.operation === "verifying";
  const working = downloading || verifying;
  const canCancel = busy && model.operation !== "restoring" &&
    model.operation !== "removing" && model.operation !== "unloading";
  const percent = Math.round(Math.min(1, Math.max(0, model.progress)) * 100);
  const ready = model.installed !== null;
  const tone = busy ? "active" : ready ? "done" : "cost";
  const caption = downloading
    ? t("model.downloading", { percent })
    : verifying ? t("model.checking", { percent })
    : model.operation === "restoring" ? t("model.restoring")
    : busy ? t("model.setupInProgress")
    : ready ? t("onboarding.modelReadyBody") : t("onboarding.modelOnce");

  function primary() {
    if (busy) return;
    if (ready) return next();
    void model.downloadModel();
  }

  return (
    <SetupStep
      dotIndex={3}
      title={t("onboarding.modelTitle")}
      body={t("onboarding.modelBody")}
      primaryLabel={
        busy ? t("model.setupInProgress") : ready
          ? t("common.continue")
          : t(model.error ? "model.retryDownload" : "model.download", { size: megabytes })
      }
      onPrimary={primary}
      primaryDisabled={busy || (!ready && !model.native)}
      backDisabled={busy}
      secondaryLabel={canCancel ? t("model.cancelOperation") : !busy && !ready ? t("onboarding.notNow") : undefined}
      onSecondary={canCancel ? () => { void model.cancel(); } : !busy && !ready ? next : undefined}
    >
      <View
        style={styles.figure}
        accessible={working}
        accessibilityRole={working ? "progressbar" : undefined}
        accessibilityLabel={working ? caption : undefined}
        accessibilityValue={working ? { min: 0, max: 100, now: percent } : undefined}
      >
        <StateFigure
          tone={tone}
          value={
            working ? String(percent) : ready ? t("onboarding.modelReady") : String(megabytes)
          }
          unit={working ? "%" : ready ? undefined : t("onboarding.megabytes")}
          caption={caption}
          progress={working ? percent / 100 : null}
        />
      </View>

      <View
        style={[
          styles.card,
          {
            backgroundColor: colors.backgroundElement,
            borderColor: colors.dashboardBorder,
          },
        ]}
      >
        <ThemedText type="smallBold" style={styles.name}>
          {localModel.name}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {t("onboarding.modelLicense", { license: localModel.license })}
        </ThemedText>

        <View
          style={[styles.facts, { borderTopColor: colors.dashboardBorder }]}
        >
          {FACTS.map((fact) => (
            <View key={fact} style={styles.fact}>
              <SymbolView
                name={{ ios: "checkmark", android: "check", web: "check" }}
                size={14}
                tintColor={colors.tint}
              />
              <ThemedText type="small" style={styles.factText}>
                {t(fact)}
              </ThemedText>
            </View>
          ))}
        </View>
      </View>

      {!ready ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("onboarding.modelLater")}
        </ThemedText>
      ) : null}
      {model.native && !ready ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("model.importGguf")}
          accessibilityState={{ disabled: busy }}
          disabled={busy}
          onPress={() => { void model.importModel(); }}
          style={[styles.importAction, busy && styles.disabled]}
        >
          <ThemedText type="smallBold" themeColor="tint">
            {t("onboarding.modelImport")}
          </ThemedText>
        </Pressable>
      ) : null}

      {!model.native ? (
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("onboarding.modelWebNote")}
        </ThemedText>
      ) : null}
      {model.error ? (
        <ThemedText
          type="small"
          themeColor="error"
          accessibilityRole="alert"
          style={styles.note}
        >
          {model.error}
        </ThemedText>
      ) : null}
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 20, padding: Spacing.three },
  name: { fontSize: 16, lineHeight: 22 },
  figure: { marginBottom: Spacing.three },
  facts: {
    borderTopWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.two,
  },
  fact: { flexDirection: "row", alignItems: "center", gap: Spacing.two },
  factText: { flex: 1 },
  note: { marginTop: Spacing.three },
  importAction: { minHeight: 44, justifyContent: "center", alignItems: "center", marginTop: Spacing.two },
  disabled: { opacity: 0.45 },
});
