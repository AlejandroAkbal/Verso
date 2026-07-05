import { StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useTheme } from '@/theme/ThemeProvider';
import { ThemedText } from './ThemedText';

type OfflineBannerProps = {
  visible: boolean;
};

export function OfflineBanner({ visible }: OfflineBannerProps) {
  const theme = useTheme();

  if (!visible) return null;

  return (
    <View style={[styles.banner, { backgroundColor: theme.colors.surfaceElevated }]}>
      <SymbolView name="wifi.slash" size={14} tintColor={theme.colors.warning} />
      <ThemedText variant="caption" color={theme.colors.textSecondary}>
        Offline Mode — showing cached catalog
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
