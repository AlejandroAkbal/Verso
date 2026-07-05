import { Tabs } from 'expo-router';
import { SymbolView } from 'expo-symbols';

import { theme } from '@/theme/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        tabBarStyle: {
          backgroundColor: theme.colors.background,
          borderTopColor: theme.colors.border,
        },
        tabBarActiveTintColor: theme.colors.text,
        tabBarInactiveTintColor: theme.colors.textMuted,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Catalog',
          tabBarIcon: ({ color }) => (
            <SymbolView name="books.vertical" size={22} tintColor={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="downloads"
        options={{
          title: 'Downloads',
          tabBarIcon: ({ color }) => (
            <SymbolView name="arrow.down.circle" size={22} tintColor={color} />
          ),
        }}
      />
    </Tabs>
  );
}
