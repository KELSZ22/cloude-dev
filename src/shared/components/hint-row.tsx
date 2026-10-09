import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from './themed-text';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

type HintRowProps = {
  title?: string;
  hint?: ReactNode;
  last?: boolean;
};

export function HintRow({ title = 'Try editing', hint = 'app/index.tsx', last = false }: HintRowProps) {
  const theme = useTheme();

  return (
    <View style={[styles.row, !last && { borderBottomColor: theme.separator, borderBottomWidth: StyleSheet.hairlineWidth }]}>
      <ThemedText type="default">{title}</ThemedText>
      <View style={styles.hint}>{hint}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 52,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    justifyContent: 'center',
    gap: 4,
  },
  hint: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
