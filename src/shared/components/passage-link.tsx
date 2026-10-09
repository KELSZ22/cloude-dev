import { Link } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from './themed-text';

/** Opens the stored passage. `marker` is the source number used in an answer, when there is one. */
export function PassageLink({ chunkId, title, detail, excerpt, marker }: {
  chunkId: string; title: string; detail?: string | null; excerpt?: string; marker?: string;
}) {
  const colors = useTheme();
  const heading = marker ? `[${marker}] ${title}` : title;
  return (
    <Link href={{ pathname: '/passage/[chunkId]', params: { chunkId } }} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={`Open source passage: ${title}`}>
        {({ pressed }) => (
          // The look lives on an inner view: on Android, Link's asChild drops a style function set on the Pressable.
          <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.backgroundElement, opacity: pressed ? 0.65 : 1 }]}>
            <ThemedText type="smallBold" themeColor="tint">{heading}</ThemedText>
            {detail ? <ThemedText type="small" themeColor="textSecondary">{detail}</ThemedText> : null}
            {excerpt ? <ThemedText type="small" numberOfLines={3}>{excerpt}</ThemedText> : null}
          </View>
        )}
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  card: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: Spacing.three, gap: Spacing.one, justifyContent: 'center' },
});
