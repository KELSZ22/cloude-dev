import { Tabs } from 'expo-router';
import { SymbolView, type SymbolViewProps } from 'expo-symbols';

import { useTheme } from '@/shared/hooks/use-theme';

const tabs: { name: string; title: string; icon: SymbolViewProps['name'] }[] = [
  { name: 'index', title: 'Home', icon: { ios: 'house', android: 'home', web: 'home' } },
  { name: 'search', title: 'Search', icon: { ios: 'magnifyingglass', android: 'search', web: 'search' } },
  { name: 'library', title: 'Library', icon: { ios: 'books.vertical', android: 'library_books', web: 'library_books' } },
  { name: 'assistant', title: 'Assistant', icon: { ios: 'bubble.left', android: 'chat_bubble', web: 'chat_bubble' } },
  { name: 'settings', title: 'Settings', icon: { ios: 'gearshape', android: 'settings', web: 'settings' } },
];

export default function TabLayout() {
  const colors = useTheme();
  return (
    <Tabs screenOptions={{
      headerShown: false,
      tabBarActiveTintColor: colors.tint,
      tabBarInactiveTintColor: colors.textSecondary,
      tabBarStyle: { backgroundColor: colors.backgroundElement, borderTopColor: colors.separator },
      tabBarHideOnKeyboard: true,
    }}>
      {tabs.map(({ name, title, icon }) => (
        <Tabs.Screen key={name} name={name} options={{
          title,
          tabBarAccessibilityLabel: title,
          tabBarIcon: ({ color, size }) => <SymbolView name={icon} size={size} tintColor={color} />,
        }} />
      ))}
    </Tabs>
  );
}
