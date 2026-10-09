import { StyleSheet } from 'react-native';

import { AnimatedIcon } from '@/shared/components/animated-icon';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { Spacing } from '@/shared/constants/theme';

type HomeHeroProps = {
  title: string;
};

export function HomeHero({ title }: HomeHeroProps) {
  return (
    <ThemedView style={styles.heroSection}>
      <AnimatedIcon />
      <ThemedText type="title" style={styles.title}>
        {title}
      </ThemedText>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
  },
  title: {
    textAlign: 'center',
  },
});
