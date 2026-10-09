import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { Spacing } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export function TextField({ label, style, multiline, ...rest }: TextInputProps & { label: string }) {
  const colors = useTheme();
  return (
    <TextInput accessibilityLabel={label} multiline={multiline} placeholderTextColor={colors.textSecondary}
      style={[styles.field, multiline && styles.multiline,
        { color: colors.text, borderColor: colors.border, backgroundColor: colors.backgroundElement }, style]}
      {...rest} />
  );
}

const styles = StyleSheet.create({
  field: { minHeight: 48, borderWidth: 1, borderRadius: 12, paddingHorizontal: Spacing.three, paddingVertical: Spacing.two, fontSize: 16, lineHeight: 24 },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
});
