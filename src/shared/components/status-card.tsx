import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function StatusCard({ title, description, children }: PropsWithChildren<{ title: string; description: string }>) {
  const colors = useTheme();
  return (
    <ThemedView type="backgroundElement" style={[styles.card, { borderColor: colors.separator }]}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
});
