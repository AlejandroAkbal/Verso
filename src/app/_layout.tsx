import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { SQLiteProvider } from 'expo-sqlite';
import { Stack } from 'expo-router';
import { Suspense, useEffect } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import 'react-native-reanimated';

import { SyncForegroundListener } from '@/components/SyncForegroundListener';
import { DownloadFeedbackListener } from '@/components/DownloadFeedbackListener';
import { ToastProvider } from '@/components/toast/ToastProvider';
import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';
import { appIdentity } from '@/config/appIdentity';
import { migrateDatabase } from '@/db/migrations';
import { queryClient } from '@/lib/queryClient';
import { registerBackgroundDownloadTask } from '@/services/downloads/task';
import { LibraryFilterProvider } from '@/context/LibraryFilterContext';
import { AppThemeProvider } from '@/theme/ThemeProvider';
import { nativeModalHeaderOptions } from '@/theme/nativeModal';
import { theme } from '@/theme/theme';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: 'index',
};

function DatabaseLoading() {
  const { t } = useTranslation();
  return (
    <Box
      flex={1}
      alignItems="center"
      backgroundColor="background"
      justifyContent="center"
      p="lg"
    >
      <ActivityIndicator color={theme.colors.accent} size="large" />
      <ThemedText color={theme.colors.textSecondary} style={{ marginTop: theme.spacing.md }}>
        {t('loading.openingLibrary')}
      </ThemedText>
    </Box>
  );
}

export default function RootLayout() {
  useEffect(() => {
    void registerBackgroundDownloadTask();
  }, []);

  return (
    <AppThemeProvider>
      <Suspense fallback={<DatabaseLoading />}>
        <SQLiteProvider
          databaseName={appIdentity.database}
          onInit={migrateDatabase}
          useSuspense
        >
          <QueryClientProvider client={queryClient}>
            <ToastProvider>
              <LibraryFilterProvider>
                <DownloadFeedbackListener />
                <SyncForegroundListener />
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
                name="library-filter"
                options={{ presentation: 'modal', ...nativeModalHeaderOptions(theme) }}
              />
              <Stack.Screen
                name="settings"
                options={{ headerShown: false, presentation: 'modal' }}
              />
            </Stack>
            </LibraryFilterProvider>
            </ToastProvider>
          </QueryClientProvider>
        </SQLiteProvider>
      </Suspense>
    </AppThemeProvider>
  );
}
