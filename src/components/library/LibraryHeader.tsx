import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { ActivityIndicator, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type LibraryHeaderProps = {
  subtitle: string;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenSettings: () => void;
  onOpenFilter: () => void;
  isFiltered: boolean;
  topInset: number;
};

export function LibraryHeader({
  subtitle,
  isRefreshing,
  onRefresh,
  onOpenSettings,
  onOpenFilter,
  isFiltered,
  topInset,
}: LibraryHeaderProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <BlurView
      intensity={60}
      tint="dark"
      style={[
        styles.blur,
        {
          paddingTop: topInset + 4,
          paddingBottom: 12,
          borderBottomWidth: StyleSheet.hairlineWidth,
          borderBottomColor: theme.colors.separator,
        },
      ]}
    >
      <Box
        gap="md"
        style={{ paddingHorizontal: 20 }}
      >
        <Box flexDirection="row" alignItems="flex-start" justifyContent="space-between">
          <Box flex={1} gap="xs" style={{ paddingRight: 12 }}>
            <ThemedText
              style={{ fontSize: 34, fontWeight: '700', letterSpacing: -0.4, lineHeight: 40 }}
            >
              {t('library.title')}
            </ThemedText>
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              {subtitle}
            </ThemedText>
          </Box>
          <Box flexDirection="row" alignItems="center" gap="sm" marginTop="xs">
            <PressableBox
              onPress={onRefresh}
              disabled={isRefreshing}
              accessibilityRole="button"
              accessibilityLabel={t('library.refresh')}
              testID="library-refresh"
              alignItems="center"
              justifyContent="center"
              width={36}
              height={36}
              borderRadius="full"
              backgroundColor="surfaceElevated"
              hitSlop={8}
              opacity={isRefreshing ? 0.6 : 1}
            >
              {isRefreshing ? (
                <ActivityIndicator color={theme.colors.textSecondary} size="small" />
              ) : (
                <SymbolView
                  name="arrow.clockwise"
                  size={18}
                  tintColor={theme.colors.textSecondary}
                  importantForAccessibility="no-hide-descendants"
                />
              )}
            </PressableBox>
            <PressableBox
              onPress={onOpenFilter}
              accessibilityRole="button"
              accessibilityLabel={t('library.sortAndFilter', 'Sort & Filter')}
              testID="library-filter"
              alignItems="center"
              justifyContent="center"
              width={36}
              height={36}
              borderRadius="full"
              backgroundColor={isFiltered ? 'groupedBackground' : 'surfaceElevated'}
              hitSlop={8}
            >
              <SymbolView
                name="line.3.horizontal.decrease"
                size={18}
                tintColor={isFiltered ? theme.colors.primary : theme.colors.textSecondary}
                importantForAccessibility="no-hide-descendants"
              />
            </PressableBox>
            <PressableBox
              onPress={onOpenSettings}
              accessibilityRole="button"
              accessibilityLabel={t('library.openSettings')}
              testID="library-settings"
              alignItems="center"
              justifyContent="center"
              width={36}
              height={36}
              borderRadius="full"
              backgroundColor="surfaceElevated"
              hitSlop={8}
            >
              <SymbolView
                name="gearshape"
                size={18}
                tintColor={theme.colors.textSecondary}
                importantForAccessibility="no-hide-descendants"
              />
            </PressableBox>
          </Box>
        </Box>
      </Box>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  blur: {
    overflow: 'hidden',
  },
});
