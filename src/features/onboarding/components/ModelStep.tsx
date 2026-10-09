import { SymbolView } from "expo-symbols";
import { StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { localModel } from "@/shared/constants/local-model";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useModel } from "@/shared/providers/model-provider";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { SetupFigure } from "./SetupFigure";
import { SetupStep } from "./SetupStep";

const FACTS: MessageKey[] = [
  "onboarding.modelFactOffline",
  "onboarding.modelFactPrivate",
  "onboarding.modelFactRemovable",
];

const megabytes = Math.round(localModel.sizeBytes / (1024 * 1024)).toString();

export function ModelStep() {
  const colors = useTheme();
  const { t } = useTranslation();
  const next = useOnboardingStore((state) => state.next);
  const model = useModel();

  const working =
    model.operation === "preparing" || model.operation === "importing";
  const ready = model.installed !== null;
  const tone = ready ? "done" : working ? "active" : "cost";

  function primary() {
    if (ready) return next();
    if (model.hasBundled) return void model.setupBundledModel();
    void model.importModel();
  }

  return (
    <SetupStep
      dotIndex={3}
      title={t("onboarding.modelTitle")}
      body={t("onboarding.modelBody")}
      primaryLabel={
        ready
          ? t("common.continue")
          : model.hasBundled
            ? t("onboarding.modelSetUp")
            : t("onboarding.modelChooseFile")
      }
      onPrimary={primary}
      primaryDisabled={working || !model.native}
      secondaryLabel={ready || working ? undefined : t("onboarding.notNow")}
      onSecondary={ready || working ? undefined : next}
    >
      <View style={styles.figure}>
        <SetupFigure
          tone={tone}
          value={
            ready
              ? t("onboarding.modelReady")
              : working
                ? `${Math.round(model.progress * 100)}`
                : megabytes
          }
          unit={ready ? undefined : working ? "%" : t("onboarding.megabytes")}
          caption={
            ready
              ? t("onboarding.modelReadyBody")
              : working
                ? t("onboarding.modelCopying")
                : t("onboarding.modelOnce")
          }
          progress={working ? model.progress : null}
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
});
