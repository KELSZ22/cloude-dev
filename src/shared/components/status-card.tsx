import type { PropsWithChildren } from 'react';
import { StyleSheet } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from './themed-text';
import { ThemedView } from './themed-view';

export function StatusCard({ title, description, children, variant = 'default' }: PropsWithChildren<{
  title: string;
  description: string;
  variant?: 'default' | 'ai';
}>) {
  const colors = useTheme();
  const type = variant === 'ai' ? 'backgroundSelected' : 'backgroundElement';
  return (
    <ThemedView type={type} style={[styles.card, { borderColor: colors.border }]}>
      <ThemedText type="subtitle">{title}</ThemedText>
      <ThemedText themeColor="textSecondary">{description}</ThemedText>
      {children}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: Spacing.three, gap: Spacing.two },
});
