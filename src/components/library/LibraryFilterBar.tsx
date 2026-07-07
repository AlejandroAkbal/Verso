import { useTranslation } from 'react-i18next';

import { FilterChip } from '@/components/FilterChip';
import { OfflineBanner } from '@/components/OfflineBanner';
import { Box, ScrollBox } from '@/components/ui';
import type { LibraryFilter } from '@/hooks/useLibraryFilters';

type LibraryFilterBarProps = {
  filter: LibraryFilter;
  setFilter: (filter: LibraryFilter) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  categoryOptions: string[];
  isOffline: boolean;
};

export function LibraryFilterBar({
  filter,
  setFilter,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
  isOffline,
}: LibraryFilterBarProps) {
  const { t } = useTranslation();

  return (
    <Box paddingTop="xs" style={{ paddingBottom: 12 }} gap="sm">
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
        <FilterChip
          label={t('library.filterAll')}
          selected={filter === 'all' && !categoryFilter}
          onPress={() => {
            setFilter('all');
            setCategoryFilter(null);
          }}
        />
        <FilterChip
          label={t('library.filterDownloaded')}
          selected={filter === 'on-device'}
          onPress={() => {
            setFilter('on-device');
            setCategoryFilter(null);
          }}
        />
        {categoryOptions.length > 0 ? (
          <Box
            width={0.5}
            height={20}
            backgroundColor="border"
            style={{ marginHorizontal: 2 }}
          />
        ) : null}
        {categoryOptions.map((category) => (
          <FilterChip
            key={category}
            label={category}
            selected={categoryFilter === category}
            onPress={() => {
              setFilter('all');
              setCategoryFilter(categoryFilter === category ? null : category);
            }}
          />
        ))}
      </ScrollBox>
      <OfflineBanner visible={isOffline} />
    </Box>
  );
}
