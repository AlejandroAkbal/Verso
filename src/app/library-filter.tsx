import { SymbolView } from 'expo-symbols';
import { ScrollView, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import type { LibrarySort } from '@/hooks/useLibraryFilters';
import { useLibraryFilterContext } from '@/context/LibraryFilterContext';

export default function LibraryFilterScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sort, setSort, categoryFilter, setCategoryFilter, categoryOptions } = useLibraryFilterContext();

  const sortOptions: { label: string; value: LibrarySort; icon: any }[] = [
    { label: t('library.sortRecent', 'Recent'), value: 'recent', icon: 'clock' },
    { label: t('library.sortProgress', 'Reading Progress'), value: 'progress', icon: 'book' },
    { label: t('library.sortOldest', 'Oldest'), value: 'oldest', icon: 'clock.arrow.circlepath' },
  ];

  return (
    <>
      <Stack.Screen
        options={{
          title: t('library.sortAndFilter', 'Sort & Filter'),
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ThemedText style={{ color: theme.colors.interactive, fontSize: 17, fontWeight: '600' }}>
                {t('common.done')}
              </ThemedText>
            </Pressable>
          ),
          headerShadowVisible: false,
        }}
      />
      <Box
        flex={1}
        backgroundColor="surface"
        style={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
          <Box paddingHorizontal="lg" marginBottom="xl">
            <ThemedText
              variant="subtitle"
              color={theme.colors.textSecondary}
              style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.sm }}
            >
              {t('library.sortBy', 'Sort By')}
            </ThemedText>
            <Box backgroundColor="surfaceElevated" borderRadius="xl" overflow="hidden">
              {sortOptions.map((option, index) => {
                const isSelected = sort === option.value;
                const isLast = index === sortOptions.length - 1;
                return (
                  <PressableBox
                    key={option.value}
                    onPress={() => setSort(option.value)}
                    flexDirection="row"
                    alignItems="center"
                    justifyContent="space-between"
                    padding="md"
                    backgroundColor="surfaceElevated"
                    style={{
                      borderBottomWidth: isLast ? 0 : 1,
                      borderBottomColor: theme.colors.border,
                    }}
                  >
                    <Box flexDirection="row" alignItems="center" gap="md">
                      <Box
                        width={2}
                        height={20}
                        backgroundColor={isSelected ? 'text' : undefined}
                        borderRadius="full"
                        style={{ marginLeft: -12 }}
                      />
                      <SymbolView name={option.icon} size={20} tintColor={theme.colors.text} />
                      <ThemedText>{option.label}</ThemedText>
                    </Box>
                    {isSelected ? (
                      <SymbolView name="checkmark" size={16} tintColor={theme.colors.text} />
                    ) : null}
                  </PressableBox>
                );
              })}
            </Box>
          </Box>

          {categoryOptions.length > 0 && (
            <Box paddingHorizontal="lg" marginBottom="xl">
              <ThemedText
                variant="subtitle"
                color={theme.colors.textSecondary}
                style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.sm }}
              >
                {t('library.categories', 'Categories')}
              </ThemedText>
              <Box flexDirection="row" flexWrap="wrap" gap="sm">
                {categoryOptions.map((cat) => {
                  const isSelected = categoryFilter === cat;
                  return (
                    <PressableBox
                      key={cat}
                      onPress={() => setCategoryFilter(isSelected ? null : cat)}
                      backgroundColor={isSelected ? 'text' : 'surfaceElevated'}
                      paddingHorizontal="md"
                      paddingVertical="sm"
                      borderRadius="full"
                    >
                      <ThemedText color={isSelected ? theme.colors.background : theme.colors.text}>
                        {cat}
                      </ThemedText>
                    </PressableBox>
                  );
                })}
              </Box>
            </Box>
          )}
        </ScrollView>
      </Box>
    </>
  );
}
