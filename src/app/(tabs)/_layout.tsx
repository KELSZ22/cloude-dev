import { Redirect, Tabs } from "expo-router";
import { SymbolView, type SymbolViewProps } from "expo-symbols";

import { Fonts } from "@/shared/constants/theme";
import { useTheme } from "@/shared/hooks/use-theme";
import { useOnboardingStore } from "@/shared/stores/onboarding-store";

const tabs: { name: string; title: string; icon: SymbolViewProps["name"] }[] = [
  {
    name: "index",
    title: "Home",
    icon: { ios: "house.fill", android: "home", web: "home" },
  },
  {
    name: "search",
    title: "Search",
    icon: { ios: "magnifyingglass", android: "search", web: "search" },
  },
  {
    name: "library",
    title: "Library",
    icon: {
      ios: "book",
      android: "menu_book",
      web: "menu_book",
    },
  },
  {
    name: "assistant",
    title: "AI",
    icon: { ios: "sparkles", android: "auto_awesome", web: "auto_awesome" },
  },
  {
    name: "settings",
    title: "Settings",
    icon: { ios: "gearshape", android: "settings", web: "settings" },
  },
];

export default function TabLayout() {
  const colors = useTheme();
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
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen
          key={name}
          name={name}
          options={{
            title,
            tabBarAccessibilityLabel: title,
            tabBarIcon: ({ color, size }) => (
              <SymbolView name={icon} size={size} tintColor={color} />
            ),
          }}
        />
      ))}
      {/* Reached from a pack or the dashboard, so it keeps the tab bar but gets no tab. */}
      <Tabs.Screen name="challenge" options={{ href: null }} />
    </Tabs>
  );
}
