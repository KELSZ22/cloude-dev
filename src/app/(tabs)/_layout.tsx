import { Redirect, Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { Fonts } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useTranslation, type MessageKey } from "@/shared/i18n";
import { useAssistantSheetStore } from "@/shared/stores/assistant-sheet-store";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";

const tabs: {
  name: string;
  titleKey: MessageKey;
  icon: SymbolViewProps["name"];
}[] = [
  {
    name: "index",
    titleKey: "tabs.home",
    icon: { ios: "house.fill", android: "home", web: "home" },
  },
  {
    name: "search",
    titleKey: "tabs.search",
    icon: { ios: "magnifyingglass", android: "search", web: "search" },
  },
  {
    name: "library",
    titleKey: "tabs.library",
    icon: {
      ios: "book",
      android: "menu_book",
      web: "menu_book",
    },
  },
  {
    name: "assistant",
    titleKey: "tabs.ai",
    icon: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
  },
  {
    name: "settings",
    titleKey: "tabs.settings",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
  },
];

export default function TabLayout() {
  const colors = useTheme();
  const { t } = useTranslation();
  const openAssistant = useAssistantSheetStore((state) => state.openAssistant);
  const hasHydrated = useOnboardingStore((state) => state.hasHydrated);
  const completed = useOnboardingStore((state) => state.completed);

  if (!hasHydrated) return null;
  if (!completed) return <Redirect href="/onboarding" />;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.tint,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarStyle: {
          backgroundColor: colors.backgroundElement,
          borderTopColor: colors.border,
        },
        // The face carries the weight; `normal` stops a synthesized bold.
        tabBarLabelStyle: { fontFamily: Fonts.medium, fontWeight: "normal" },
        tabBarHideOnKeyboard: true,
      }}
    >
      {tabs.map(({ name, titleKey, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title: t(titleKey),
            tabBarAccessibilityLabel: t(titleKey),
            tabBarIcon: ({ color, size }) => (
              <SymbolView name={icon} size={size} tintColor={color} />
            ),
          }}
          listeners={
            name === "assistant"
              ? {
                  tabPress: (event) => {
                    event.preventDefault();
                    openAssistant();
                  },
                }
              : undefined
          }
        />
      ))}
      {/* Reached from a pack or the dashboard, so it keeps the tab bar but gets no tab. */}
      <Tabs.Screen name="challenge" options={{ href: null }} />
    </Tabs>
  );
}
