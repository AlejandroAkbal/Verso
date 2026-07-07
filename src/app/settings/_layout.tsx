import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';

import { ToastProvider } from '@/components/toast/ToastProvider';
import { PressableBox, Text } from '@/components/ui';
import { theme } from '@/theme/theme';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
    <ToastProvider>
    <Stack
      screenOptions={{
        headerTransparent: Platform.OS === 'ios',
        headerBlurEffect: 'dark',
        headerStyle: Platform.select({
          ios: { backgroundColor: 'transparent' },
          android: { backgroundColor: theme.colors.background },
        }),
        headerTintColor: theme.colors.text,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: theme.colors.background, flex: 1 },
        headerBackTitle: t('common.back'),
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: t('settings.title'),
          headerLargeTitle: false,
          headerRight: () => (
            <PressableBox onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: theme.colors.interactive, fontSize: 17, fontWeight: '600' }}>{t('common.done')}</Text>
            </PressableBox>
          ),
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
