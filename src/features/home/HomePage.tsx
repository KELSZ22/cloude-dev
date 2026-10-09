import { ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeHero, HomeHintsSection } from '@/features/home/components';
import { useHome } from '@/features/home/hooks';
import { ScreenHeader } from '@/shared/components/screen-header';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, Spacing } from '@/shared/constants/theme';

export default function HomePage() {
  const insets = useSafeAreaInsets();
  const { content, devMenuHint } = useHome();
  const title = content?.title ?? 'Welcome to Expo';
  const subtitle = content?.subtitle ?? 'Get started';

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader title="Home" subtitle={subtitle} />
        <HomeHero title={title} />
        <HomeHintsSection devMenuHint={devMenuHint} />
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
  },
});
