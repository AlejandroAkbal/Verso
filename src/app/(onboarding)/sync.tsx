import { useRouter } from 'expo-router';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingSyncScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { t } = useTranslation();
  const { completeOnboarding } = useOnboarding();

  const finish = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
  };

  const openSyncSettings = async () => {
    await completeOnboarding();
    router.replace('/(tabs)');
    requestAnimationFrame(() => router.push('/settings/koreader'));
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
        <SymbolView name="arrow.triangle.2.circlepath" size={56} tintColor={theme.colors.text} />
        <ThemedText
          variant="title"
          style={{ fontSize: 32, lineHeight: 38, marginTop: 8, textAlign: 'center' }}
        >
          {t('onboarding.syncTitle')}
        </ThemedText>
        <ThemedText
          variant="body"
          color={theme.colors.textSecondary}
          style={{ textAlign: 'center', lineHeight: 24, marginTop: 8 }}
        >
          {t('onboarding.syncBody')}
        </ThemedText>
      </Box>

      <Box gap="lg">
        <Point
          icon="book.pages"
          title={t('onboarding.syncPoint1Title')}
          body={t('onboarding.syncPoint1Body')}
        />
        <Point
          icon="iphone.and.arrow.forward"
          title={t('onboarding.syncPoint2Title')}
          body={t('onboarding.syncPoint2Body')}
        />
        <Point
          icon="checkmark.shield"
          title={t('onboarding.syncPoint3Title')}
          body={t('onboarding.syncPoint3Body')}
        />
      </Box>

      <Box gap="md" alignItems="center">
        <PressableBox
          alignItems="center"
          paddingVertical="md"
          borderRadius="full"
          width="100%"
          backgroundColor="primary"
          onPress={() => void openSyncSettings()}
        >
          <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
            {t('onboarding.syncEnable')}
          </ThemedText>
        </PressableBox>
        <PressableBox onPress={() => void finish()} hitSlop={8}>
          <ThemedText variant="body" color={theme.colors.textSecondary}>
            {t('onboarding.syncSkip')}
          </ThemedText>
        </PressableBox>
      </Box>
    </Box>
  );
}

function Point({
  icon,
  title,
  body,
}: {
  icon: 'book.pages' | 'iphone.and.arrow.forward' | 'checkmark.shield';
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
