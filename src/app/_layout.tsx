import {
  NotoSans_400Regular,
  NotoSans_500Medium,
  NotoSans_600SemiBold,
  NotoSans_700Bold,
} from "@expo-google-fonts/noto-sans";
import { useFonts } from "expo-font";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";

import { AssistantSheet } from "@/features/assistant";
import { Fonts } from "@/shared/constants/theme";
import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTranslation } from "@/shared/i18n";
import { useInitializeTheme } from "@/shared/hooks/use-initialize-theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { FloatingAssistantProvider } from "@/shared/providers/floating-assistant-provider";
import { KnowledgeProvider } from "@/shared/providers/knowledge-provider";
import { ModelProvider } from "@/shared/providers/model-provider";
import { useHydrateOnboardingStore } from "@/shared/stores/onboarding-store";

void SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  const { t } = useTranslation();
  useInitializeTheme();
  useHydrateOnboardingStore();

  const [fontsLoaded, fontError] = useFonts({
    NotoSans_400Regular,
    NotoSans_500Medium,
    NotoSans_600SemiBold,
    NotoSans_700Bold,
  });

  useEffect(() => {
    // Hide on failure too, otherwise a missing face would strand the splash.
    if (fontsLoaded || fontError) void SplashScreen.hideAsync();
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <KnowledgeProvider>
        <ModelProvider>
          <FloatingAssistantProvider>
            <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: colors.backgroundElement },
                headerTintColor: colors.text,
                headerTitleStyle: {
                  fontFamily: Fonts.semibold,
                  fontWeight: "normal",
                },
                contentStyle: { backgroundColor: colors.background },
              }}
            >
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="onboarding"
                options={{ headerShown: false, animation: "fade" }}
              />
              <Stack.Screen name="setup" options={{ title: t("stack.offlineSetup") }} />
              <Stack.Screen
                name="import"
                options={{ title: t("stack.importDocument") }}
              />
              <Stack.Screen name="model" options={{ title: t("stack.onDeviceModel") }} />
              <Stack.Screen
                name="packs/index"
                options={{ title: t("stack.knowledgePacks") }}
              />
              <Stack.Screen name="article/[id]" options={{ headerShown: false }} />
              <Stack.Screen
                name="passage/[chunkId]"
                options={{ title: t("stack.sourcePassage") }}
              />
              <Stack.Screen
                name="floating-assistant"
                options={{ title: t("stack.floatingAssistant") }}
              />
            </Stack>
            <AssistantSheet />
          </FloatingAssistantProvider>
        </ModelProvider>
      </KnowledgeProvider>
    </ThemeProvider>
  );
}
