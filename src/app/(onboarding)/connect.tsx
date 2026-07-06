import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ServerForm } from '@/components/settings/ServerForm';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useServers } from '@/db/hooks/useServers';
import { useTheme } from '@/theme/ThemeProvider';

let devPrefill: Partial<{
  url: string;
  username: string;
  password: string;
}> = {};

if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    devPrefill = require('@/config/dev-secrets').DEV_OPDS;
  } catch {
    devPrefill = {};
  }
}

export default function OnboardingConnectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { addServer } = useServers();
  const { setActive } = useActiveServer();
  const { completeOnboarding } = useOnboarding();

  return (
    <Box flex={1} backgroundColor="background">
      <Box paddingHorizontal="sm" style={{ paddingTop: insets.top + 8 }}>
        <PressableBox
          onPress={() => router.back()}
          flexDirection="row"
          alignItems="center"
          gap="xs"
          paddingHorizontal="sm"
          paddingVertical="xs"
          hitSlop={12}
        >
          <SymbolView name="chevron.left" size={18} tintColor={theme.colors.textSecondary} />
          <ThemedText variant="body" color={theme.colors.textSecondary}>
            {t('common.back')}
          </ThemedText>
        </PressableBox>
      </Box>

      <Box gap="sm" style={{ paddingHorizontal: 20 }} paddingBottom="sm">
        <ThemedText variant="title">{t('onboarding.connectTitle')}</ThemedText>
        <ThemedText variant="body" color={theme.colors.textSecondary}>
          {t('onboarding.connectStep')}
        </ThemedText>
      </Box>

      <ServerForm
        initial={devPrefill}
        showHelper
        submitLabelKey="serverForm.saveAndOpen"
        onSubmit={async (input) => {
          const server = await addServer(input);
          await setActive(server.id);
          await completeOnboarding();
          router.replace('/(tabs)');
        }}
      />
    </Box>
  );
}
