import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

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
          title: t('settings.title'),
          headerLargeTitle: false,
          headerRight: () => (
            <PressableBox
              onPress={() => router.back()}
              hitSlop={8}
              alignItems="center"
              justifyContent="center"
              width={36}
              height={36}
              borderRadius="full"
              backgroundColor="surfaceElevated"
            >
              <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
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
