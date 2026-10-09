import { SymbolView } from "expo-symbols";
import { useEffect, useRef, useState } from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  type View,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";
import {
  APP_LOCALES,
  LOCALE_NAMES,
  useOnboardingStore,
} from "@/shared/stores/onboarding-store";

const GAP = 6;

/**
 * Language switch for a screen header. The menu drops from the trigger, which is
 * measured on press so the same component works wherever the header sits.
 */
export function LanguageMenu({ tintColor }: { tintColor: string }) {
  const colors = useTheme();
  const { t } = useTranslation();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const language = useOnboardingStore((state) => state.language);
  const setLanguage = useOnboardingStore((state) => state.setLanguage);
  const trigger = useRef<View>(null);
  const [open, setOpen] = useState(false);
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({
    top: 0,
    right: Spacing.three,
  });

  // Reanimated's `entering` prop does not fire inside a Modal, so the drop runs
  // off a shared value instead.
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(open ? 1 : 0, {
      duration: reducedMotion ? 0 : open ? 180 : 120,
      easing: open ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [open, reducedMotion, progress]);

  const drop = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [
      { translateY: (1 - progress.value) * -10 },
      { scale: 0.96 + progress.value * 0.04 },
    ],
  }));

  function openMenu() {
    const node = trigger.current;
    if (!node) {
      setOpen(true);
      return;
    }
    node.measureInWindow((x, y, triggerWidth, height) => {
      setAnchor({
        top: y + height + GAP,
        right: Math.max(Spacing.two, width - (x + triggerWidth)),
      });
      setOpen(true);
    });
  }

  return (
    <>
      <Pressable
        ref={trigger}
        accessibilityRole="button"
        accessibilityLabel={`${t("settings.language")}, ${LOCALE_NAMES[language]}`}
        accessibilityState={{ expanded: open }}
        onPress={openMenu}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <SymbolView
          name={{ ios: "globe", android: "language", web: "language" }}
          size={22}
          tintColor={tintColor}
        />
        <ThemedText type="smallBold" style={[styles.code, { color: tintColor }]}>
          {language.toUpperCase()}
        </ThemedText>
      </Pressable>
      <Modal
        visible={open}
        transparent
        animationType="none"
        statusBarTranslucent
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={() => setOpen(false)}
          style={styles.backdrop}
        />
        <Animated.View
          style={[
            styles.menu,
            {
              top: anchor.top,
              right: anchor.right,
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
            },
            drop,
          ]}
        >
          {APP_LOCALES.map((locale, index) => {
            const selected = locale === language;
            return (
              <Pressable
                key={locale}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={LOCALE_NAMES[locale]}
                onPress={() => {
                  setLanguage(locale);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && { borderTopWidth: 1, borderTopColor: colors.border },
                  pressed && { backgroundColor: colors.backgroundSelected },
                ]}
              >
                <ThemedText
                  type="small"
                  style={[styles.optionLabel, selected && { color: colors.tint }]}
                >
                  {LOCALE_NAMES[locale]}
                </ThemedText>
                {selected ? (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={16}
                    tintColor={colors.tint}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    minWidth: 44,
    height: 44,
    paddingHorizontal: 6,
  },
  pressed: { opacity: 0.6 },
  code: { fontSize: 13, lineHeight: 18 },
  backdrop: { ...StyleSheet.absoluteFill },
  menu: {
    position: "absolute",
    minWidth: 180,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    boxShadow: "0 8px 20px rgba(13, 27, 42, 0.18)",
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: Spacing.two,
    minHeight: 48,
    paddingHorizontal: Spacing.two,
  },
  optionLabel: { fontSize: 15, lineHeight: 20, fontWeight: "500" },
});
