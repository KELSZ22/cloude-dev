import { SymbolView } from "expo-symbols";
import { useEffect } from "react";
import { Modal, Pressable, StyleSheet, View } from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation } from "@/shared/i18n";

export function OptionSheet<T extends string>({
  title,
  visible,
  options,
  value,
  onSelect,
  onClose,
}: {
  title: string;
  visible: boolean;
  options: readonly { id: T; label: string }[];
  value: T;
  onSelect: (id: T) => void;
  onClose: () => void;
}) {
  const colors = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();

  // Reanimated's `entering` prop does not fire inside a Modal, so the slide runs
  // off a shared value instead. `travel` is the sheet's own height, measured on
  // layout, so it starts exactly one sheet below its resting place.
  const progress = useSharedValue(0);
  const travel = useSharedValue(420);

  useEffect(() => {
    const duration = reducedMotion ? 0 : visible ? 260 : 180;
    progress.value = withTiming(visible ? 1 : 0, {
      duration,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [visible, reducedMotion, progress]);

  const slide = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - progress.value) * travel.value }],
  }));

  return (
    <Modal
      visible={visible}
      transparent
      // The modal fades the dim in place; only the sheet travels upward.
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t("common.close")}
          onPress={onClose}
          style={[StyleSheet.absoluteFill, styles.backdrop]}
        />
        <Animated.View
          onLayout={(event) => {
            travel.value = event.nativeEvent.layout.height;
          }}
          style={[
            styles.sheet,
            {
              backgroundColor: colors.backgroundElement,
              borderColor: colors.border,
              paddingBottom: insets.bottom + Spacing.three,
            },
            slide,
          ]}
        >
          <View style={styles.handleRow}>
            <View style={[styles.handle, { backgroundColor: colors.border }]} />
          </View>
          <ThemedText
            type="smallBold"
            accessibilityRole="header"
            style={styles.title}
          >
            {title}
          </ThemedText>
          {options.map((option) => {
            const selected = option.id === value;
            return (
              <Pressable
                key={option.id}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={option.label}
                onPress={() => {
                  onSelect(option.id);
                  onClose();
                }}
                style={({ pressed }) => [
                  styles.option,
                  { borderTopColor: colors.border },
                  pressed && { backgroundColor: colors.backgroundSelected },
                ]}
              >
                <ThemedText
                  type="small"
                  style={[
                    styles.optionLabel,
                    selected && { color: colors.tint, fontWeight: "700" },
                  ]}
                >
                  {option.label}
                </ThemedText>
                {selected ? (
                  <SymbolView
                    name={{ ios: "checkmark", android: "check", web: "check" }}
                    size={18}
                    tintColor={colors.tint}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: "flex-end" },
  backdrop: { backgroundColor: "rgba(13, 27, 42, 0.45)" },
  sheet: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    borderTopWidth: 1,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: Spacing.three,
    overflow: "hidden",
  },
  handleRow: { alignItems: "center", paddingVertical: 10 },
  handle: { width: 40, height: 4, borderRadius: 2 },
  title: { fontSize: 15, lineHeight: 20, paddingVertical: Spacing.two },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 52,
    borderTopWidth: 1,
  },
  optionLabel: { fontSize: 15, lineHeight: 20, fontWeight: "500" },
});
