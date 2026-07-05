import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

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
    <View style={[styles.banner, { backgroundColor: theme.colors.surfaceElevated }]}>
      <SymbolView name="wifi.slash" size={14} tintColor={theme.colors.warning} />
      <ThemedText variant="caption" color={theme.colors.textSecondary}>
        {t('library.offlineBanner')}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
