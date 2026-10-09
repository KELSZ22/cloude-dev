import type { PropsWithChildren } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Spacing } from '@/shared/constants/theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function Page({ title, description, children, nested = false }: PropsWithChildren<{
  title: string;
  description?: string;
  nested?: boolean;
}>) {
  const insets = useSafeAreaInsets();
  return (
    <ThemedView style={styles.screen}>
      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={[
        styles.content,
        { paddingTop: (nested ? 0 : insets.top) + Spacing.four, paddingBottom: insets.bottom + Spacing.four },
      ]}>
        <ThemedText type="smallBold" themeColor="tint">ARALSEARCH AI</ThemedText>
        <ThemedText type="title" accessibilityRole="header">{title}</ThemedText>
        {description && <ThemedText themeColor="textSecondary">{description}</ThemedText>}
        {children}
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: Spacing.four, gap: Spacing.three, width: '100%', maxWidth: 680, alignSelf: 'center' },
});
