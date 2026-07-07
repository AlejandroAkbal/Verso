import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/FilterChip';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Box, ScrollBox, PressableBox } from '@/components/ui';
import type { LibraryFilter } from '@/hooks/useLibraryFilters';
import { SymbolView } from 'expo-symbols';
import { useTheme } from '@/theme/ThemeProvider';

type LibraryFilterBarProps = {
  filter: LibraryFilter;
  setFilter: (filter: LibraryFilter) => void;
  isOffline: boolean;
  isFiltered: boolean;
  onOpenFilter: () => void;
};

export function LibraryFilterBar({
  filter,
  setFilter,
  isOffline,
  isFiltered,
  onOpenFilter,
}: LibraryFilterBarProps) {
  const { t } = useTranslation();
  const theme = useTheme();

  return (
    <Box style={{ paddingBottom: 8 }}>
      <ScrollBox
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, flexShrink: 0, maxHeight: 44, marginHorizontal: -4 }}
        contentContainerStyle={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          paddingHorizontal: 4,
          paddingVertical: 2,
        }}
      >
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
        <FilterChip
          label={t('library.filterAll')}
          selected={filter === 'all'}
          onPress={() => {
            setFilter('all');
          }}
        />
        <FilterChip
          label={t('library.filterDownloaded')}
          selected={filter === 'on-device'}
          onPress={() => {
            setFilter('on-device');
          }}
        />
      </ScrollBox>
      <OfflineBanner visible={isOffline} />
    </Box>
  );
}
