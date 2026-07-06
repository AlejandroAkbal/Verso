import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useServers } from '@/db/hooks/useServers';
import { ensureDefaultPublicServers } from '@/db/seedServers';
import { appIdentity } from '@/config/appIdentity';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingWelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { setActive } = useActiveServer();
  const { completeOnboarding } = useOnboarding();
  const { servers } = useServers();
  const hasLibrary = servers.length > 0;

  const explorePublicLibrary = async () => {
    const rows = await ensureDefaultPublicServers(db);
    const publicServer = rows.find((server) => server.id.startsWith('seed-')) ?? rows[0];
    if (publicServer) {
      await setActive(publicServer.id);
    }
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  return (
    <Box
      flex={1}
      paddingHorizontal="lg"
      justifyContent="space-between"
      backgroundColor="background"
      style={{ paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 }}
    >
      <Box alignItems="center" gap="md">
        <SymbolView name="books.vertical.fill" size={56} tintColor={theme.colors.text} />
        <ThemedText variant="title" style={{ fontSize: 34, marginTop: 8 }}>
          {appIdentity.displayName}
        </ThemedText>
        <ThemedText
          variant="subtitle"
          color={theme.colors.textSecondary}
          style={{ textAlign: 'center' }}
        >
          {t('onboarding.tagline')}
        </ThemedText>
        <ThemedText
          variant="body"
          color={theme.colors.textSecondary}
          style={{ textAlign: 'center', lineHeight: 24, marginTop: 8 }}
        >
          {t('onboarding.description')}
        </ThemedText>
      </Box>

      <Box gap="lg">
        <Point
          icon="server.rack"
          title={t('onboarding.point1Title')}
          body={t('onboarding.point1Body')}
        />
        <Point
          icon="icloud.and.arrow.down"
          title={t('onboarding.point2Title')}
          body={t('onboarding.point2Body')}
        />
        <Point
          icon="lock.fill"
          title={t('onboarding.point3Title')}
          body={t('onboarding.point3Body')}
        />
      </Box>

      <Box gap="md" alignItems="center">
        <PressableBox
          alignItems="center"
          paddingVertical="md"
          borderRadius="full"
          width="100%"
          backgroundColor="primary"
          onPress={() => router.push('/(onboarding)/connect')}
        >
          <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
            {t('onboarding.connectButton')}
          </ThemedText>
        </PressableBox>
        <PressableBox onPress={() => void explorePublicLibrary()} hitSlop={8}>
          <ThemedText variant="body" color={theme.colors.textSecondary}>
            {t('onboarding.exampleButton')}
          </ThemedText>
        </PressableBox>
        {hasLibrary ? (
          <PressableBox onPress={() => router.replace('/(tabs)')} hitSlop={8}>
            <ThemedText variant="body" color={theme.colors.textSecondary}>
              {t('onboarding.backToLibrary')}
            </ThemedText>
          </PressableBox>
        ) : null}
      </Box>
    </Box>
  );
}

function Point({
  icon,
  title,
  body,
}: {
  icon: 'server.rack' | 'icloud.and.arrow.down' | 'lock.fill';
  title: string;
  body: string;
}) {
  const theme = useTheme();

  return (
    <Box flexDirection="row" gap="md" alignItems="flex-start">
      <SymbolView name={icon} size={22} tintColor={theme.colors.textSecondary} />
      <Box flex={1} gap="xs">
        <ThemedText variant="subtitle">{title}</ThemedText>
        <ThemedText variant="caption" color={theme.colors.textSecondary}>
          {body}
        </ThemedText>
      </Box>
    </Box>
  );
}
