import { SymbolView } from "expo-symbols";
import type { ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { ThemedText } from "@/shared/components/themed-text";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

export function ChallengeHeader({
  title,
  onBack,
  trailing,
}: {
  title: string;
  onBack: () => void;
  trailing?: ReactNode;
}) {
  const colors = useTheme();

  return (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Go back"
        onPress={onBack}
        style={({ pressed }) => [styles.back, pressed && styles.pressed]}
      >
        <SymbolView
          name={{
            ios: "arrow.left",
            android: "arrow_back",
            web: "arrow_back",
          }}
          size={22}
          tintColor={colors.text}
        />
      </Pressable>
      <ThemedText
        type="smallBold"
        accessibilityRole="header"
        style={styles.title}
        numberOfLines={1}
      >
        {title}
      </ThemedText>
      <View style={styles.trailing}>{trailing}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 48,
    paddingRight: Spacing.three,
  },
  back: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  title: { flex: 1, fontSize: 18, lineHeight: 24, letterSpacing: -0.2 },
  trailing: { minWidth: 36, alignItems: "flex-end" },
  pressed: { opacity: 0.6 },
});
