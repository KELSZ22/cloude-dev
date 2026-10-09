import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import {
  APP_LOCALES,
  LOCALE_NAMES,
  ONBOARDING_TOPIC_IDS,
  type OnboardingTopicId,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";
import { OnboardingButton } from "./OnboardingButton";

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

const topicIcons: Record<OnboardingTopicId, SymbolViewProps["name"]> = {
  general: { ios: "graduationcap.fill", android: "school", web: "school" },
  science: { ios: "atom", android: "science", web: "science" },
  technology: { ios: "laptopcomputer", android: "computer", web: "computer" },
  history: {
    ios: "building.columns.fill",
    android: "account_balance",
    web: "account_balance",
  },
  health: { ios: "heart.fill", android: "favorite", web: "favorite" },
  business: { ios: "briefcase.fill", android: "work", web: "work" },
  arts: { ios: "paintpalette.fill", android: "palette", web: "palette" },
  environment: { ios: "leaf.fill", android: "eco", web: "eco" },
};

export function PreferencesStep() {
  const colors = useTheme();
  const { t } = useTranslation();
  const [pickerOpen, setPickerOpen] = useState(false);
  const language = useOnboardingStore((state) => state.language);
  const topics = useOnboardingStore((state) => state.topics);
  const back = useOnboardingStore((state) => state.back);
  const complete = useOnboardingStore((state) => state.complete);
  const setLanguage = useOnboardingStore((state) => state.setLanguage);
  const toggleTopic = useOnboardingStore((state) => state.toggleTopic);

  return (
    <View style={styles.screen}>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.scroll}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={back}
          style={styles.back}
        >
          <SymbolView
            name={{
              ios: "chevron.left",
              android: "arrow_back",
              web: "arrow_back",
            }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {t("onboarding.personalizeTitle")}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lead}>
          {t("onboarding.personalizeBody")}
        </ThemedText>

        <ThemedText type="smallBold" style={styles.section}>
          {t("onboarding.preferredLanguage")}
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("onboarding.preferredLanguageValue", {
            language: LOCALE_NAMES[language],
          })}
          onPress={() => setPickerOpen(true)}
          style={StyleSheet.flatten([
            styles.select,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundElement,
            },
          ])}
        >
          <ThemedText>{LOCALE_NAMES[language]}</ThemedText>
          <SymbolView
            name={{
              ios: "chevron.down",
              android: "expand_more",
              web: "expand_more",
            }}
            size={20}
            tintColor={colors.textSecondary}
          />
        </Pressable>

        <ThemedText type="smallBold" style={styles.section}>
          {t("onboarding.topicsOptional")}
        </ThemedText>
        <View style={styles.grid}>
          {ONBOARDING_TOPIC_IDS.map((id) => {
            const selected = topics.includes(id);
            const label = t(topicLabelKey[id]);
            return (
              <Pressable
                key={id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={label}
                onPress={() => toggleTopic(id)}
                style={StyleSheet.flatten([
                  styles.topic,
                  {
                    borderColor: selected ? colors.tint : colors.border,
                    backgroundColor: selected
                      ? colors.backgroundSelected
                      : colors.backgroundElement,
                  },
                ])}
              >
                <SymbolView
                  name={topicIcons[id]}
                  size={18}
                  tintColor={selected ? colors.tint : colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: selected ? colors.tint : colors.text }}
                >
                  {label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <OnboardingButton label={t("common.continue")} onPress={complete} />
        </View>
      </ScrollView>

      <Modal
        visible={pickerOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPickerOpen(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setPickerOpen(false)}>
          <ThemedView
            type="backgroundElement"
            style={[styles.sheet, { borderColor: colors.border }]}
          >
            <ThemedText type="smallBold">
              {t("onboarding.preferredLanguage")}
            </ThemedText>
            {APP_LOCALES.map((option) => (
              <Pressable
                key={option}
                accessibilityRole="button"
                onPress={() => {
                  setLanguage(option);
                  setPickerOpen(false);
                }}
                style={styles.option}
              >
                <ThemedText themeColor={option === language ? "tint" : "text"}>
                  {LOCALE_NAMES[option]}
                </ThemedText>
              </Pressable>
            ))}
          </ThemedView>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.four },
  back: { width: 44, height: 44, justifyContent: "center" },
  lead: { marginTop: Spacing.two, marginBottom: Spacing.three },
  section: { marginTop: Spacing.three, marginBottom: Spacing.two },
  select: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: Spacing.two },
  topic: {
    width: "48%",
    flexGrow: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: Spacing.two,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  footer: { marginTop: "auto", paddingVertical: Spacing.four },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(13, 27, 42, 0.35)",
    justifyContent: "center",
    padding: Spacing.four,
  },
  sheet: {
    borderWidth: 1,
    borderRadius: 20,
    padding: Spacing.three,
    gap: Spacing.one,
  },
  option: { minHeight: 44, justifyContent: "center" },
});
