import { Stack, useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, Text } from 'react-native';

import { theme } from '@/theme/theme';

export default function SettingsLayout() {
  const { t } = useTranslation();
  const router = useRouter();

  return (
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
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <Text style={{ color: theme.colors.interactive, fontSize: 17 }}>{t('common.done')}</Text>
            </Pressable>
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
    </Stack>
  );
}
