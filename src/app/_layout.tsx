import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { migrateDatabase } from '@/db/migrations';
import { registerBackgroundDownloadTask } from '@/services/downloads/task';
import { VersoThemeProvider } from '@/theme/ThemeProvider';
import { theme } from '@/theme/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

export default function RootLayout() {
  useEffect(() => {
    void registerBackgroundDownloadTask();
  }, []);

  return (
    <SQLiteProvider databaseName="verso.db" onInit={migrateDatabase}>
      <QueryClientProvider client={queryClient}>
        <VersoThemeProvider>
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: theme.colors.background },
              headerTintColor: theme.colors.text,
              headerShadowVisible: false,
              contentStyle: { backgroundColor: theme.colors.background },
            }}
          >
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="book/[id]"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="reader/[id]"
              options={{ headerShown: false, presentation: 'fullScreenModal' }}
            />
            <Stack.Screen
              name="settings"
              options={{ title: 'OPDS Servers', presentation: 'modal' }}
            />
          </Stack>
        </VersoThemeProvider>
      </QueryClientProvider>
    </SQLiteProvider>
  );
}
