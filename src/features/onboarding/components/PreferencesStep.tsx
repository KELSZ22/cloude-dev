import { SymbolView, type SymbolViewProps } from "expo-symbols";
import { useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import {
  ONBOARDING_LANGUAGES,
  ONBOARDING_TOPICS,
  type OnboardingTopicId,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";
import { OnboardingButton } from "./OnboardingButton";

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
          accessibilityLabel="Back"
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
          Let&apos;s personalize your experience
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.lead}>
          Choose your preferred language and topics of interest. You can change
          this later in Settings.
        </ThemedText>

        <ThemedText type="smallBold" style={styles.section}>
          Preferred Language
        </ThemedText>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Preferred language, ${language}`}
          onPress={() => setPickerOpen(true)}
          style={StyleSheet.flatten([
            styles.select,
            {
              borderColor: colors.border,
              backgroundColor: colors.backgroundElement,
            },
          ])}
        >
          <ThemedText>{language}</ThemedText>
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
          Topics of Interest (optional)
        </ThemedText>
        <View style={styles.grid}>
          {ONBOARDING_TOPICS.map((topic) => {
            const selected = topics.includes(topic.id);
            return (
              <Pressable
                key={topic.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={topic.label}
                onPress={() => toggleTopic(topic.id)}
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
                  name={topicIcons[topic.id]}
                  size={18}
                  tintColor={selected ? colors.tint : colors.textSecondary}
                />
                <ThemedText
                  type="small"
                  style={{ color: selected ? colors.tint : colors.text }}
                >
                  {topic.label}
                </ThemedText>
              </Pressable>
            );
          })}
        </View>

        <View style={styles.footer}>
          <OnboardingButton label="Continue" onPress={complete} />
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
            <ThemedText type="smallBold">Preferred Language</ThemedText>
            {ONBOARDING_LANGUAGES.map((option) => (
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
                  {option}
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
