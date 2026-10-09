import { SymbolView } from "expo-symbols";
import { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useKnowledge } from "@/shared/providers/knowledge-provider";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { SetupFigure } from "./SetupFigure";
import { SetupStep } from "./SetupStep";

export function PacksStep() {
  const colors = useTheme();
  const { t } = useTranslation();
  const complete = useOnboardingStore((state) => state.complete);
  const knowledge = useKnowledge();
  const [chosen, setChosen] = useState<readonly string[]>(() =>
    knowledge.bundled.map((pack) => pack.id),
  );

  const library = knowledge.state;
  const installed =
    library.status === "ready" ? library.packs.map((pack) => pack.id) : [];
  const problem =
    library.status === "unavailable"
      ? library.reason
      : library.status === "error"
        ? library.message
        : null;
  // Nothing can be added until the library opens, so the step offers to move on instead.
  const pending =
    library.status === "ready"
      ? knowledge.bundled.filter(
          (pack) => chosen.includes(pack.id) && !installed.includes(pack.id),
        )
      : [];
  const passages = knowledge.bundled
    .filter((pack) => chosen.includes(pack.id) || installed.includes(pack.id))
    .reduce((total, pack) => total + pack.passages, 0);

  function finish() {
    if (pending.length === 0) return complete();
    void knowledge
      .installPacks(pending.map((pack) => pack.id))
      .then(complete, complete);
  }

  return (
    <SetupStep
      dotIndex={4}
      title={t("onboarding.packsTitle")}
      body={t("onboarding.packsBody")}
      primaryLabel={
        knowledge.installing
          ? t("onboarding.packsAdding")
          : pending.length > 0
            ? t("onboarding.packsAdd", { count: pending.length })
            : t("onboarding.packsFinish")
      }
      onPrimary={finish}
      primaryDisabled={knowledge.installing || library.status === "opening"}
    >
      <View style={styles.figure}>
        <SetupFigure
          tone={passages > 0 ? "active" : "cost"}
          value={passages.toString()}
          unit={t("onboarding.passages")}
          caption={t("onboarding.packsCaption")}
          progress={null}
        />
      </View>

      {problem ? (
        <ThemedText
          type="small"
          themeColor="textSecondary"
          style={styles.problem}
        >
          {problem}
        </ThemedText>
      ) : null}

      <View style={styles.list}>
        {knowledge.bundled.map((pack) => {
          const added = installed.includes(pack.id);
          const selected = added || chosen.includes(pack.id);
          return (
            <Pressable
              key={pack.id}
              accessibilityRole="checkbox"
              accessibilityState={{
                checked: selected,
                disabled: added || !!problem,
              }}
              accessibilityLabel={pack.title}
              disabled={added || !!problem || knowledge.installing}
              onPress={() =>
                setChosen((current) =>
                  current.includes(pack.id)
                    ? current.filter((id) => id !== pack.id)
                    : [...current, pack.id],
                )
              }
              style={[
                styles.pack,
                {
                  backgroundColor: selected
                    ? colors.backgroundSelected
                    : colors.backgroundElement,
                  borderColor: selected ? colors.tint : colors.dashboardBorder,
                },
              ]}
            >
              <View
                style={[
                  styles.tick,
                  {
                    backgroundColor: selected ? colors.tint : "transparent",
                    borderColor: selected
                      ? colors.tint
                      : colors.dashboardBorder,
                  },
                ]}
              >
                {selected ? (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={13}
                    tintColor={colors.backgroundElement}
                  />
                ) : null}
              </View>
              <View style={styles.packBody}>
                <ThemedText type="smallBold" style={styles.packTitle}>
                  {pack.title}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {t("onboarding.packMeta", {
                    passages: pack.passages,
                    language: pack.language.toUpperCase(),
                    license: pack.license,
                  })}
                </ThemedText>
                <ThemedText
                  type="small"
                  themeColor="textSecondary"
                  numberOfLines={3}
                >
                  {pack.description}
                </ThemedText>
                {added ? (
                  <ThemedText type="small" themeColor="tint">
                    {t("onboarding.packAdded")}
                  </ThemedText>
                ) : null}
              </View>
            </Pressable>
          );
        })}
        <ThemedText type="small" themeColor="textSecondary" style={styles.note}>
          {t("onboarding.packsLater")}
        </ThemedText>
      </View>
    </SetupStep>
  );
}

const styles = StyleSheet.create({
  figure: { marginBottom: Spacing.three },
  problem: { marginBottom: Spacing.three },
  list: { gap: Spacing.two },
  pack: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
  },
  tick: {
    width: 22,
    height: 22,
    borderRadius: 7,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  packBody: { flex: 1, gap: 2 },
  packTitle: { fontSize: 15, lineHeight: 21 },
  note: { marginTop: Spacing.one },
});
