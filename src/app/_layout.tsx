import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useTheme } from '@/shared/hooks/use-theme';
import { KnowledgeProvider } from '@/shared/providers/knowledge-provider';
import { ModelProvider } from '@/shared/providers/model-provider';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <KnowledgeProvider>
      <ModelProvider>
      <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
      <Stack screenOptions={{
        headerStyle: { backgroundColor: colors.backgroundElement },
        headerTintColor: colors.text,
        contentStyle: { backgroundColor: colors.background },
      }}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ title: 'Offline setup' }} />
        <Stack.Screen name="import" options={{ title: 'Import a document' }} />
        <Stack.Screen name="model" options={{ title: 'On-device model' }} />
        <Stack.Screen name="packs/index" options={{ title: 'Knowledge Packs' }} />
        <Stack.Screen name="passage/[chunkId]" options={{ title: 'Source passage' }} />
      </Stack>
      </ModelProvider>
      </KnowledgeProvider>
    </ThemeProvider>
  );
}
