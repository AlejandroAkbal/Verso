import { Modal } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { LibrarySort } from '@/hooks/useLibraryFilters';

type LibrarySortFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  sort: LibrarySort;
  setSort: (sort: LibrarySort) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  categoryOptions: string[];
};

export function LibrarySortFilterSheet({
  visible,
  onClose,
  sort,
  setSort,
  categoryFilter,
  setCategoryFilter,
  categoryOptions,
}: LibrarySortFilterSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const sortOptions: { label: string; value: LibrarySort; icon: string }[] = [
    { label: t('library.sortRecent', 'Recent'), value: 'recent', icon: 'clock' },
    { label: t('library.sortProgress', 'Reading Progress'), value: 'progress', icon: 'book' },
    { label: t('library.sortOldest', 'Oldest'), value: 'oldest', icon: 'clock.arrow.circlepath' },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box
        flex={1}
        backgroundColor="background"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="lg"
          marginBottom="md"
        >
          <ThemedText variant="title">{t('library.sortAndFilter', 'Sort & Filter')}</ThemedText>
          <PressableBox
            onPress={onClose}
            hitSlop={8}
            testID="close-filter-sheet"
            alignItems="center"
            justifyContent="center"
            width={36}
            height={36}
            borderRadius="full"
            backgroundColor="surfaceElevated"
          >
            <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
        </Box>

        <ScrollBox contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <Box gap="xl">
            <Box gap="sm">
              <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
                {t('library.sortBy', 'Sort By')}
              </ThemedText>
              <Box backgroundColor="surfaceElevated" borderRadius="lg" overflow="hidden">
                {sortOptions.map((opt, index) => (
                  <PressableBox
                    key={opt.value}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    style={{
                      paddingVertical: 14,
                      paddingHorizontal: 16,
                      borderBottomWidth: index < sortOptions.length - 1 ? 0.5 : 0,
                      borderBottomColor: theme.colors.separator,
                      position: 'relative',
                    }}
                    onPress={() => setSort(opt.value)}
                  >
                    {/* Left accent bar for selected row */}
                    {sort === opt.value ? (
                      <Box
                        style={{
                          position: 'absolute',
                          left: 0,
                          top: 8,
                          bottom: 8,
                          width: 3,
                          borderRadius: 2,
                          backgroundColor: theme.colors.primary,
                        }}
                      />
                    ) : null}
                    <Box flexDirection="row" alignItems="center" gap="md" style={{ paddingLeft: sort === opt.value ? 8 : 0 }}>
                      <SymbolView
                        name={opt.icon as any}
                        size={20}
                        tintColor={sort === opt.value ? theme.colors.primary : theme.colors.textSecondary}
                      />
                      <ThemedText
                        style={{ fontWeight: sort === opt.value ? '600' : '400' }}
                        color={sort === opt.value ? theme.colors.primary : theme.colors.text}
                      >
                        {opt.label}
                      </ThemedText>
                    </Box>
                    {sort === opt.value ? (
                      <SymbolView name="checkmark" size={14} tintColor={theme.colors.primary} />
                    ) : null}
                  </PressableBox>
                ))}
              </Box>
            </Box>

            {categoryOptions.length > 0 ? (
              <Box gap="sm">
                <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
                  {t('library.categories', 'Categories')}
                </ThemedText>
                <Box flexDirection="row" flexWrap="wrap" gap="sm">
                  {categoryOptions.map((category) => {
                    const isSelected = categoryFilter === category;
                    return (
                      <PressableBox
                        key={category}
                        onPress={() => setCategoryFilter(isSelected ? null : category)}
                        backgroundColor={isSelected ? 'primary' : 'surfaceElevated'}
                        paddingHorizontal="md"
                        paddingVertical="sm"
                        borderRadius="full"
                        style={{
                          borderWidth: 1,
                          borderColor: isSelected ? theme.colors.primary : theme.colors.border,
                        }}
                      >
                        <ThemedText
                          variant="caption"
                          style={{
                            fontWeight: isSelected ? '600' : '400',
                            color: isSelected ? theme.colors.background : theme.colors.text,
                          }}
                        >
                          {category}
                        </ThemedText>
                      </PressableBox>
                    );
                  })}
                </Box>
              </Box>
            ) : null}
          </Box>
        </ScrollBox>
      </Box>
    </Modal>
  );
}
