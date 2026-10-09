/**
 * Learn more about light and dark modes:
 * https://docs.expo.dev/develop/user-interface/color-themes/
 */

import { Colors } from '@/shared/constants/theme';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';

export function useTheme() {
  const scheme = useColorScheme();
  return Colors[scheme];
}
