import { Image } from 'expo-image';
import { SymbolView } from 'expo-symbols';
import { Pressable, ScrollView, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { EXPLORE_DOC_URL } from '@/features/explore/services';
import { Collapsible } from '@/shared/components/collapsible';
import { ExternalLink } from '@/shared/components/external-link';
import { ScreenHeader } from '@/shared/components/screen-header';
import { ThemedText } from '@/shared/components/themed-text';
import { ThemedView } from '@/shared/components/themed-view';
import { BottomTabInset, Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export default function ExplorePage() {
  const insets = useSafeAreaInsets();
  const theme = useTheme();

  return (
    <ThemedView style={styles.screen}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: insets.top + Spacing.three,
            paddingBottom: insets.bottom + BottomTabInset + Spacing.four,
          },
        ]}
        showsVerticalScrollIndicator={false}>
        <ScreenHeader
          title="Explore"
          subtitle="Example screens and patterns for a native app."
        />

        <ExternalLink href={EXPLORE_DOC_URL} asChild>
          <Pressable style={({ pressed }) => [styles.docsRow, pressed && styles.pressed]}>
            <ThemedView type="backgroundElement" style={styles.docsInner}>
              <ThemedView type="backgroundSelected" style={styles.docsIcon}>
                <SymbolView
                  tintColor={theme.tint}
                  size={18}
                  name={{ ios: 'book.fill', android: 'menu_book', web: 'menu_book' }}
                />
              </ThemedView>
              <ThemedText style={styles.docsLabel}>Expo documentation</ThemedText>
              <SymbolView
                tintColor={theme.textSecondary}
                size={14}
                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
              />
            </ThemedView>
          </Pressable>
        </ExternalLink>

        <ThemedView style={styles.section}>
          <ThemedText type="smallBold" themeColor="textSecondary" style={styles.label}>
            Guides
          </ThemedText>
          <ThemedView type="backgroundElement" style={styles.group}>
            <Collapsible title="File-based routing">
              <ThemedText type="small" themeColor="textSecondary">
                Routes in <ThemedText type="code">src/app/</ThemedText> re-export pages from{' '}
                <ThemedText type="code">src/features/</ThemedText>.
              </ThemedText>
              <ExternalLink href="https://docs.expo.dev/router/introduction">
                <ThemedText type="linkPrimary">Learn more</ThemedText>
              </ExternalLink>
            </Collapsible>

            <Collapsible title="Android, iOS, and web">
              <ThemedText type="small" themeColor="textSecondary">
                Same React Native UI on every platform. Press{' '}
                <ThemedText type="smallBold">w</ThemedText> in the terminal to preview on web.
              </ThemedText>
              <Image
                source={require('@/assets/images/tutorial-web.png')}
                style={styles.imageTutorial}
              />
            </Collapsible>

            <Collapsible title="Images">
              <ThemedText type="small" themeColor="textSecondary">
                Use <ThemedText type="code">@2x</ThemedText> and{' '}
                <ThemedText type="code">@3x</ThemedText> suffixes for screen densities.
              </ThemedText>
              <Image source={require('@/assets/images/react-logo.png')} style={styles.imageReact} />
              <ExternalLink href="https://reactnative.dev/docs/images">
                <ThemedText type="linkPrimary">Learn more</ThemedText>
              </ExternalLink>
            </Collapsible>

            <Collapsible title="Light and dark mode">
              <ThemedText type="small" themeColor="textSecondary">
                <ThemedText type="code">useColorScheme()</ThemedText> follows the system theme.
              </ThemedText>
              <ExternalLink href="https://docs.expo.dev/develop/user-interface/color-themes/">
                <ThemedText type="linkPrimary">Learn more</ThemedText>
              </ExternalLink>
            </Collapsible>

            <Collapsible title="Animations" last>
              <ThemedText type="small" themeColor="textSecondary">
                Collapsible rows use <ThemedText type="code">react-native-reanimated</ThemedText>.
              </ThemedText>
            </Collapsible>
          </ThemedView>
        </ThemedView>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    gap: Spacing.four,
  },
  docsRow: {
    marginHorizontal: Spacing.four,
  },
  docsInner: {
    minHeight: 52,
    borderRadius: 12,
    paddingHorizontal: Spacing.three,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  docsIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docsLabel: {
    flex: 1,
  },
  pressed: {
    opacity: 0.7,
  },
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
  imageTutorial: {
    width: '100%',
    aspectRatio: 296 / 171,
    borderRadius: 10,
    marginTop: Spacing.two,
  },
  imageReact: {
    width: 72,
    height: 72,
    alignSelf: 'center',
    marginTop: Spacing.two,
  },
});
