import { Stack } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ToastProvider } from '@/components/toast/ToastProvider';
import { theme } from '@/theme/theme';

export default function SettingsLayout() {
  const { t } = useTranslation();

  return (
    <ToastProvider>
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: theme.colors.background },
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background, flex: 1 },
        headerBackTitle: t('common.back'),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="add"
        options={{
          title: t('settings.addServer'),
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="[id]"
        options={{
          title: t('settings.editServer'),
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="koreader"
        options={{
          title: t('sync.title'),
          presentation: 'card',
        }}
      />
      <Stack.Screen
        name="reader"
        options={{
          title: t('reader.settingsTitle'),
          presentation: 'card',
        }}
      />
    </Stack>
    </ToastProvider>
  );
}
