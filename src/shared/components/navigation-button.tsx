import { Link, type Href } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from './themed-text';

export function NavigationButton({ href, label }: { href: Href; label: string }) {
  const colors = useTheme();
  return (
    <Link href={href} asChild>
      <Pressable accessibilityRole="link" accessibilityLabel={label}
        style={({ pressed }) => [styles.button, { borderColor: colors.tint, backgroundColor: colors.backgroundSelected, opacity: pressed ? 0.65 : 1 }]}>
        <ThemedText themeColor="tint">{label}</ThemedText>
      </Pressable>
    </Link>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: Spacing.three, justifyContent: 'center' },
});
