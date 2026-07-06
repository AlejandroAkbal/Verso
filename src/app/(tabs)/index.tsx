import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { SymbolView } from 'expo-symbols';

import { BookCard } from '@/components/BookCard';
import { FilterChip } from '@/components/FilterChip';
import { LibraryFooter } from '@/components/LibraryFooter';
import { OfflineBanner } from '@/components/OfflineBanner';
import { SearchField } from '@/components/SearchField';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import { useDownloads } from '@/db/hooks/useDownloads';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useServers } from '@/db/hooks/useServers';
import {
  parseBookCategories,
  useOPDSCatalog,
  useOPDSSearch,
} from '@/hooks/useOPDSCatalog';
import { useReadingProgressMap } from '@/hooks/useReadingProgress';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import type { BookRow } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';

type LibraryFilter = 'all' | 'on-device';

function matchesSearch(book: BookRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    book.title.toLowerCase().includes(normalized) ||
    book.author.toLowerCase().includes(normalized)
  );
}

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { servers, loading: serversLoading } = useServers();
  const { activeServer, loading: activeServerLoading } = useActiveServer();
  const { downloads } = useDownloads();
  const { progressByBookId, refresh: refreshProgress } = useReadingProgressMap();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { books, isOffline, isLoading, isRefetching, refresh, refreshBooks, error, searchUrl } =
    useOPDSCatalog(
      activeServer?.id,
      activeServer?.url,
      activeServer?.auth_username,
    );

  const remoteSearch = useOPDSSearch(
    activeServer?.id,
    activeServer?.url,
    activeServer?.auth_username ?? '',
    searchUrl,
    searchQuery,
  );

  useFocusEffect(
    useCallback(() => {
      void refreshProgress();
      void refreshBooks();
    }, [refreshBooks, refreshProgress]),
  );

  const downloadedIds = useMemo(
    () =>
      new Set(
        downloads.filter((d) => d.status === 'completed').map((d) => d.book_id),
      ),
    [downloads],
  );

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      for (const category of parseBookCategories(book)) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([name]) => name);
  }, [books]);

  const sourceBooks = useMemo(() => {
    const trimmed = searchQuery.trim();
    const candidates =
      trimmed.length >= 2 && remoteSearch.data && remoteSearch.data.length > 0
        ? remoteSearch.data
        : books;
    return candidates.filter((book) => book.download_url.length > 0);
  }, [books, remoteSearch.data, searchQuery]);

  const visibleBooks = useMemo(() => {
    let list = sourceBooks;

    if (filter === 'on-device') {
      list = list.filter((book) => downloadedIds.has(book.id));
    }

    if (categoryFilter) {
      list = list.filter((book) =>
        parseBookCategories(book).includes(categoryFilter),
      );
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      list = list.filter((book) => matchesSearch(book, trimmed));
    } else if (trimmed.length >= 2 && (!remoteSearch.data || remoteSearch.data.length === 0)) {
      list = list.filter((book) => matchesSearch(book, trimmed));
    }

    return list;
  }, [
    sourceBooks,
    filter,
    categoryFilter,
    downloadedIds,
    searchQuery,
    remoteSearch.data,
  ]);

  const numColumns = theme.grid.numColumns;
  const cardWidth = useMemo(() => {
    const totalGap = theme.grid.gap * (numColumns - 1);
    const totalPadding = theme.grid.horizontalPadding * 2;
    return (width - totalPadding - totalGap) / numColumns;
  }, [width, numColumns, theme.grid.gap, theme.grid.horizontalPadding]);

  const catalogBooks = useMemo(
    () => books.filter((book) => book.download_url.length > 0),
    [books],
  );

  const isFiltered = useMemo(
    () =>
      filter !== 'all' ||
      categoryFilter != null ||
      searchQuery.trim().length > 0,
    [filter, categoryFilter, searchQuery],
  );

  const libraryStats = useMemo(() => {
    let downloadedCount = 0;
    let inProgressCount = 0;
    let finishedCount = 0;

    for (const book of catalogBooks) {
      if (downloadedIds.has(book.id)) {
        downloadedCount += 1;
      }

      const progress = progressByBookId.get(book.id);
      const percent = progressPercent(progress);
      if (percent != null && percent > 0) {
        if (isFinished(progress)) {
          finishedCount += 1;
        } else {
          inProgressCount += 1;
        }
      }
    }

    return { downloadedCount, inProgressCount, finishedCount };
  }, [catalogBooks, downloadedIds, progressByBookId]);

  const listFooter = useMemo(
    () => (
      <LibraryFooter
        visibleCount={visibleBooks.length}
        totalCount={catalogBooks.length}
        downloadedCount={libraryStats.downloadedCount}
        inProgressCount={libraryStats.inProgressCount}
        finishedCount={libraryStats.finishedCount}
        serverTitle={activeServer?.title ?? t('common.catalog')}
        isFiltered={isFiltered}
      />
    ),
    [
      visibleBooks.length,
      catalogBooks.length,
      libraryStats,
      activeServer?.title,
      isFiltered,
      t,
    ],
  );

  const renderItem = useCallback(
    ({ item }: { item: BookRow }) => {
      const isOnDevice = downloadedIds.has(item.id);
      const dimmed = isOffline && !isOnDevice;

      return (
        <Box style={{ marginBottom: theme.grid.gap }}>
          <BookCard
            book={item}
            width={cardWidth}
            readingProgress={progressByBookId.get(item.id)}
            dimmed={dimmed}
          />
        </Box>
      );
    },
    [cardWidth, downloadedIds, isOffline, progressByBookId, theme.grid.gap],
  );

  const listHeader = useMemo(
    () => (
      <Box paddingTop="xs" style={{ paddingBottom: 12 }} gap="sm">
        <ScrollBox
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            flexGrow: 0,
            flexShrink: 0,
            maxHeight: 44,
            marginHorizontal: -4,
          }}
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
    ),
    [categoryFilter, categoryOptions, filter, isOffline, t],
  );

  if (serversLoading || activeServerLoading) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
        padding="lg"
        gap="md"
      >
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  if (servers.length === 0) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
        padding="lg"
        gap="md"
      >
        <ThemedText variant="subtitle">{t('library.noLibrary')}</ThemedText>
        <ThemedText
          variant="body"
          color={theme.colors.textSecondary}
          style={{ paddingHorizontal: 24, textAlign: 'center' }}
        >
          {t('library.noLibraryHint')}
        </ThemedText>
        <PressableBox onPress={() => router.push('/settings')} padding="sm">
          <ThemedText color={theme.colors.textSecondary}>{t('library.connectServer')}</ThemedText>
        </PressableBox>
      </Box>
    );
  }

  const isSearching = searchQuery.trim().length >= 2 && remoteSearch.isFetching;

  return (
    <Box flex={1} backgroundColor="background">
      <Box
        gap="md"
        style={{ paddingHorizontal: 20, paddingBottom: 12, paddingTop: insets.top + 4 }}
      >
        <Box
          flexDirection="row"
          alignItems="flex-start"
          justifyContent="space-between"
        >
          <Box flex={1} gap="xs" style={{ paddingRight: 12 }}>
            <ThemedText
              style={{
                fontSize: 34,
                fontWeight: '700',
                letterSpacing: -0.4,
                lineHeight: 40,
              }}
            >
              {t('library.title')}
            </ThemedText>
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              {activeServer?.title ?? t('common.catalog')}
            </ThemedText>
          </Box>
          <PressableBox
            onPress={() => router.push('/settings')}
            accessibilityRole="button"
            accessibilityLabel={t('library.openSettings')}
            testID="library-settings"
            alignItems="center"
            justifyContent="center"
            width={36}
            height={36}
            borderRadius="full"
            backgroundColor="surfaceElevated"
            marginTop="xs"
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

        <Box position="relative">
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('library.searchPlaceholder')}
          />
          {isSearching ? (
            <ActivityIndicator
              color={theme.colors.textSecondary}
              size="small"
              style={{ position: 'absolute', right: 14, top: 14 }}
            />
          ) : null}
        </Box>
      </Box>

      {isLoading ? (
        <Box flex={1} alignItems="center" justifyContent="center" padding="lg" gap="md">
          <ActivityIndicator color={theme.colors.text} />
        </Box>
      ) : (
        <FlashList
          data={visibleBooks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={{ flex: 1 }}
          ListHeaderComponent={listHeader}
          ListFooterComponent={visibleBooks.length > 0 ? listFooter : null}
          contentContainerStyle={{
            paddingHorizontal: theme.grid.horizontalPadding,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.text}
            />
          }
          ListEmptyComponent={
            <Box alignItems="center" paddingVertical="xxl" paddingHorizontal="lg">
              <ThemedText color={theme.colors.textSecondary}>
                {filter === 'on-device'
                  ? t('library.emptyDownloaded')
                  : searchQuery.trim()
                    ? t('library.emptySearch')
                    : (error ?? t('library.emptyCatalog'))}
              </ThemedText>
            </Box>
          }
        />
      )}
    </Box>
  );
}
