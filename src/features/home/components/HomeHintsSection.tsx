import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';

import { HintRow } from '@/shared/components/hint-row';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

type HomeHintsSectionProps = {
  devMenuHint: ReactNode;
};

export function HomeHintsSection({ devMenuHint }: HomeHintsSectionProps) {
  return (
    <ThemedView type="backgroundElement" style={styles.stepContainer}>
      <HintRow
        title="Try editing"
        hint={<ThemedText type="code">src/features/home/HomePage.tsx</ThemedText>}
      />
      <HintRow title="Dev tools" hint={devMenuHint} />
      <HintRow
        title="Fresh start"
        hint={<ThemedText type="code">npm run reset-project</ThemedText>}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  stepContainer: {
    gap: Spacing.three,
    alignSelf: 'stretch',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.four,
    borderRadius: Spacing.four,
  },
});
