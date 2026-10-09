import { useColorScheme } from "@/shared/hooks/use-color-scheme";
import { useTheme } from "@/shared/hooks/use-theme";
import { ModelProvider } from "@/shared/providers/model-provider";
import { useHydrateOnboardingStore } from "@/shared/stores/onboarding-store";
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const colors = useTheme();
  useHydrateOnboardingStore();

  return (
    <ThemeProvider value={colorScheme === "dark" ? DarkTheme : DefaultTheme}>
      <ModelProvider>
        <StatusBar style={colorScheme === "dark" ? "light" : "dark"} />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.backgroundElement },
            headerTintColor: colors.text,
            contentStyle: { backgroundColor: colors.background },
          }}
        >
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="onboarding"
            options={{ headerShown: false, animation: "fade" }}
          />
          <Stack.Screen name="setup" options={{ title: "Offline setup" }} />
          <Stack.Screen
            name="import"
            options={{ title: "Import a document" }}
          />
          <Stack.Screen name="model" options={{ title: "On-device model" }} />
          <Stack.Screen
            name="packs/index"
            options={{ title: "Knowledge Packs" }}
          />
        </Stack>
      </ModelProvider>
    </ThemeProvider>
  );
}
