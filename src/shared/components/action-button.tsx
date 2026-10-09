import { Pressable, StyleSheet } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';
import { ThemedText } from './themed-text';

export function ActionButton({ label, onPress, disabled = false, destructive = false }: {
  label: string; onPress: () => void; disabled?: boolean; destructive?: boolean;
}) {
  const colors = useTheme();
  const color = destructive ? colors.error : colors.tint;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled }}
      disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button,
        { borderColor: color, opacity: disabled ? 0.45 : pressed ? 0.65 : 1 }]}>
      <ThemedText style={{ color }}>{label}</ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { minHeight: 48, borderWidth: 1, borderRadius: 12, padding: Spacing.three, justifyContent: 'center' },
});
