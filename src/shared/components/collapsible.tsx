import { SymbolView } from "expo-symbols";
import { PropsWithChildren, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import Animated, { FadeIn } from "react-native-reanimated";

import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";

export function Collapsible({
  children,
  title,
  last = false,
}: PropsWithChildren & { title: string; last?: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  const theme = useTheme();

  return (
    <ThemedView
      type="backgroundElement"
      style={
        !last && {
          borderBottomColor: theme.separator,
          borderBottomWidth: StyleSheet.hairlineWidth,
        }
      }
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={title}
        accessibilityState={{ expanded: isOpen }}
        onPress={() => setIsOpen((value) => !value)}
        style={({ pressed }) => [
          styles.heading,
          pressed && styles.pressedHeading,
        ]}
      >
        <ThemedText style={styles.title}>{title}</ThemedText>
        <SymbolView
          name={{
            ios: "chevron.right",
            android: "chevron_right",
            web: "chevron_right",
          }}
          size={14}
          weight="semibold"
          tintColor={theme.textSecondary}
          style={{ transform: [{ rotate: isOpen ? "90deg" : "0deg" }] }}
        />
      </Pressable>
      {isOpen ? (
        <Animated.View entering={FadeIn.duration(160)}>
          <View style={styles.content}>{children}</View>
        </Animated.View>
      ) : null}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heading: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.two,
  },
  pressedHeading: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
  },
  content: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.three,
    gap: Spacing.two,
  },
});
