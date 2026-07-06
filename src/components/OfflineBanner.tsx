import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Box } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemedText } from './ThemedText';

type OfflineBannerProps = {
  visible: boolean;
};

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  if (!visible) return null;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      paddingHorizontal="md"
      paddingVertical="sm"
      backgroundColor="surfaceElevated"
    >
      <SymbolView name="wifi.slash" size={14} tintColor={theme.colors.warning} />
      <ThemedText variant="caption" color={theme.colors.textSecondary}>
        {t('library.offlineBanner')}
      </ThemedText>
    </Box>
  );
}
