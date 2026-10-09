import type { PropsWithChildren } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { LeafDecor } from "@/shared/components/leaf-decor";
import { ThemedText } from "@/shared/components/themed-text";
import { ThemedView } from "@/shared/components/themed-view";
import { Spacing } from "@/shared/constants/theme";

/**
 * The Settings screen's frame, for the pages pushed on top of it. The native header already names
 * the screen, so the title here is the one the user reads; both sit on the same surface.
 */
export function StackPage({ title, children }: PropsWithChildren<{ title: string }>) {
  const insets = useSafeAreaInsets();

  return (
    <ThemedView type="backgroundElement" style={styles.screen}>
      <LeafDecor width={130} />
      <View style={styles.header}>
        <ThemedText type="title" accessibilityRole="header" style={styles.title}>
          {title}
        </ThemedText>
      </View>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + Spacing.five }]}
      >
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
  },
  title: { fontSize: 28, lineHeight: 34, letterSpacing: -0.4 },
  scroll: {
    width: "100%",
    maxWidth: 600,
    alignSelf: "center",
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    gap: Spacing.three,
  },
});
