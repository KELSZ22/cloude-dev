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
    <ThemedView style={styles.section}>
      <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
        Get started
      </ThemedText>
      <ThemedView type="backgroundElement" style={styles.group}>
        <HintRow
          title="Try editing"
          hint={<ThemedText type="code">src/features/home/HomePage.tsx</ThemedText>}
        />
        <HintRow title="Dev tools" hint={devMenuHint} last={false} />
        <HintRow
          title="Fresh start"
          hint={<ThemedText type="code">bun run reset-project</ThemedText>}
          last
        />
      </ThemedView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.two,
  },
  label: {
    marginHorizontal: Spacing.four,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  group: {
    marginHorizontal: Spacing.four,
    borderRadius: 12,
    overflow: 'hidden',
  },
});
