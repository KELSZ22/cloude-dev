import { Platform, StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { fontFamilyForWeight, Fonts, ThemeColor } from '@/shared/constants/theme';
import { useTheme } from '@/shared/hooks/use-theme';

export type ThemedTextProps = TextProps & {
  type?:
    | 'default'
    | 'title'
    | 'small'
    | 'smallBold'
    | 'subtitle'
    | 'link'
    | 'linkPrimary'
    | 'code'
    | 'tabLabel';
  themeColor?: ThemeColor;
};

export function ThemedText({ style, type = 'default', themeColor, ...rest }: ThemedTextProps) {
  const theme = useTheme();
  const typeStyle = styles[type];
  const resolved = StyleSheet.flatten<TextStyle>([typeStyle, style]);

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        typeStyle,
        style,
        // A per-weight font file already carries its weight, so the request is
        // reset to normal — otherwise each platform synthesizes a second bold
        // on top of the face.
        !resolved.fontFamily && {
          fontFamily: fontFamilyForWeight(resolved.fontWeight),
          fontWeight: "normal",
        },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 34,
    fontWeight: 700,
    lineHeight: 41,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontSize: 20,
    lineHeight: 25,
    fontWeight: 600,
  },
  tabLabel: {
    fontSize: 10,
    lineHeight: 12,
    fontWeight: 500,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
