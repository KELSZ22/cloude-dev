import { Platform, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HomeHero, HomeHintsSection } from '@/features/home/components';
import { useHome } from '@/features/home/hooks';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { WebBadge } from '@/shared/components/web-badge';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/shared/constants/theme';

export default function HomePage() {
  const { content, devMenuHint } = useHome();
  const title = content?.title ?? 'Welcome to Expo';
  const subtitle = content?.subtitle ?? 'get started';

  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <HomeHero title={title} />
        <ThemedText type="code" style={styles.code}>
          {subtitle}
        </ThemedText>
        <HomeHintsSection devMenuHint={devMenuHint} />
        {Platform.OS === 'web' && <WebBadge />}
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    alignItems: 'center',
    gap: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  code: {
    textTransform: 'uppercase',
  },
});
