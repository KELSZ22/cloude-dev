import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/shared/components/animated-icon';
import { AppShell } from '@/shared/components/app-shell';
import AppTabs from '@/shared/components/app-tabs';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AppShell>
        <StatusBar style="auto" />
        <AnimatedSplashOverlay />
        <AppTabs />
      </AppShell>
    </ThemeProvider>
  );
}
