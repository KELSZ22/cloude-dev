import { SymbolView } from "expo-symbols";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { withAlpha } from "@/shared/lib/color";

export type AnswerState = "idle" | "selected" | "correct" | "wrong" | "missed";

export function AnswerOption({
  letter,
  label,
  state,
  locked,
  onPress,
}: {
  letter: string;
  label: string;
  state: AnswerState;
  locked: boolean;
  onPress: () => void;
}) {
  const colors = useTheme();

  const accent =
    state === "wrong"
      ? colors.error
      : state === "correct" || state === "selected" || state === "missed"
        ? colors.tint
        : null;

  const background =
    state === "wrong"
      ? withAlpha(colors.error, 0.08)
      : state === "correct" || state === "selected" || state === "missed"
        ? colors.backgroundSelected
        : colors.backgroundElement;

  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{
        checked: state === "selected" || state === "correct" || state === "wrong",
        disabled: locked,
      }}
      accessibilityLabel={`${letter}. ${label}`}
      disabled={locked}
      onPress={onPress}
      style={({ pressed }) => [
        styles.option,
        {
          backgroundColor: background,
          borderColor: accent ?? colors.border,
          borderWidth: accent ? 1.5 : 1,
        },
        pressed && !locked && styles.pressed,
      ]}
    >
      <ThemedText
        type="smallBold"
        style={[styles.letter, { color: colors.textSecondary }]}
      >
        {`${letter}.`}
      </ThemedText>
      <ThemedText type="small" style={styles.label}>
        {label}
      </ThemedText>
      <Marker state={state} />
    </Pressable>
  );
}

function Marker({ state }: { state: AnswerState }) {
  const colors = useTheme();

  if (state === "selected" || state === "correct" || state === "missed") {
    return (
      <View style={[styles.marker, { backgroundColor: colors.tint }]}>
        <SymbolView
          name={{ ios: "checkmark", android: "check", web: "check" }}
          size={14}
          tintColor={colors.backgroundElement}
        />
      </View>
    );
  }

  if (state === "wrong") {
    return (
      <View style={[styles.marker, { backgroundColor: colors.error }]}>
        <SymbolView
          name={{ ios: "xmark", android: "close", web: "close" }}
          size={14}
          tintColor={colors.backgroundElement}
        />
      </View>
    );
  }

  return <View style={[styles.hollow, { borderColor: colors.border }]} />;
}

const styles = StyleSheet.create({
  option: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    minHeight: 54,
    paddingHorizontal: 14,
    paddingVertical: Spacing.two,
    borderRadius: 14,
  },
  letter: { fontSize: 14, lineHeight: 20, width: 20 },
  label: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: "500" },
  marker: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  hollow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  pressed: { opacity: 0.75 },
});
