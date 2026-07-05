import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { migrateDatabase } from '@/db/migrations';
import { queryClient } from '@/lib/queryClient';
import { registerBackgroundDownloadTask } from '@/services/downloads/task';
import { VersoThemeProvider } from '@/theme/ThemeProvider';
import { theme } from '@/theme/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

function DatabaseLoading() {
  const { t } = useTranslation();
  return (
    <View style={styles.centered}>
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <ThemedText style={styles.loadingText}>{t('loading.openingLibrary')}</ThemedText>
    </View>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void registerBackgroundDownloadTask();
  }, []);

  return (
    <VersoThemeProvider>
      <Suspense fallback={<DatabaseLoading />}>
        <SQLiteProvider
          databaseName="verso.db"
          onInit={migrateDatabase}
          useSuspense
        >
          <QueryClientProvider client={queryClient}>
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.colors.background },
                headerTintColor: theme.colors.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.colors.background },
              }}
            >
              <Stack.Screen name="index" options={{ headerShown: false }} />
              <Stack.Screen name="(onboarding)" options={{ headerShown: false }} />
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
                options={{ headerShown: false, presentation: 'modal' }}
              />
            </Stack>
          </QueryClientProvider>
        </SQLiteProvider>
      </Suspense>
    </VersoThemeProvider>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  loadingText: {
    color: theme.colors.textSecondary,
    marginTop: theme.spacing.md,
  },
});
