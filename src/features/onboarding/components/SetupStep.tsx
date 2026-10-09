import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";
import { OnboardingButton } from "./OnboardingButton";
import { ONBOARDING_DOTS, StepDots } from "./StepDots";

/**
 * Shared frame for the two setup decisions. Both ask the same thing in the same shape: here is
 * what goes on your phone, here is what it costs, say yes or say later.
 */
export function SetupStep({
  dotIndex,
  title,
  body,
  children,
  primaryLabel,
  onPrimary,
  primaryDisabled,
  secondaryLabel,
  onSecondary,
}: {
  dotIndex: number;
  title: string;
  body: string;
  children: ReactNode;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  secondaryLabel?: string;
  onSecondary?: () => void;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const back = useOnboardingStore((state) => state.back);

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.back")}
          onPress={back}
          style={styles.back}
        >
          <SymbolView
            name={{ ios: "chevron.left", android: "arrow_back", web: "arrow_back" }}
            size={22}
            tintColor={colors.text}
          />
        </Pressable>
        <ThemedText type="title" accessibilityRole="header">
          {title}
        </ThemedText>
        <ThemedText themeColor="textSecondary" style={styles.body}>
          {body}
        </ThemedText>
        {children}
      </ScrollView>
      <View style={styles.footer}>
        <OnboardingButton
          label={primaryLabel}
          onPress={onPrimary}
          disabled={primaryDisabled}
        />
        {secondaryLabel && onSecondary ? (
          <Pressable
            accessibilityRole="button"
            onPress={onSecondary}
            style={styles.secondary}
          >
            <ThemedText type="smallBold" themeColor="textSecondary">
              {secondaryLabel}
            </ThemedText>
          </Pressable>
        ) : null}
        <View style={styles.dots}>
          <StepDots total={ONBOARDING_DOTS} index={dotIndex} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: Spacing.four, paddingBottom: Spacing.three },
  back: { width: 44, height: 44, justifyContent: "center", marginLeft: -Spacing.two },
  body: { marginTop: Spacing.two, marginBottom: Spacing.four },
  footer: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.two,
    gap: Spacing.two,
    alignItems: "stretch",
  },
  secondary: { minHeight: 44, alignItems: "center", justifyContent: "center" },
  dots: { alignItems: "center", paddingTop: Spacing.one, paddingBottom: Spacing.two },
});
