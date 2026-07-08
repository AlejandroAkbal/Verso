import { FlashList } from '@shopify/flash-list';
import { useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { BookCard } from '@/components/BookCard';
import { SearchField } from '@/components/SearchField';
import { LibraryFilterBar } from '@/components/library/LibraryFilterBar';
import { LibraryFooter } from '@/components/LibraryFooter';
import { LibraryHeader } from '@/components/library/LibraryHeader';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useDownloads } from '@/db/hooks/useDownloads';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useServers } from '@/db/hooks/useServers';
import { useOPDSCatalog, useOPDSSearch } from '@/hooks/useOPDSCatalog';
import { useReadingProgressMap } from '@/hooks/useReadingProgress';
import { useLibraryFilters } from '@/hooks/useLibraryFilters';
import { useLibraryRefresh } from '@/hooks/useLibraryRefresh';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import type { BookRow, DownloadRow } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';

export default function LibraryScreen() {
  const theme = useTheme();
  const router = useRouter();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { servers, loading: serversLoading } = useServers();
  const { activeServer, loading: activeServerLoading } = useActiveServer();
  const { downloads, refresh: refreshDownloads } = useDownloads();
  const { progressByBookId, refresh: refreshProgress, loading: progressLoading } = useReadingProgressMap();
  const [searchQuery, setSearchQuery] = useState('');

  const {
    books,
    isOffline,
    isLoading,
    isRefetching,
    refresh,
    refreshBooks,
    error,
    searchUrl,
  } = useOPDSCatalog(activeServer?.id, activeServer?.url, activeServer?.auth_username);

  const { refreshLibrary, isRefreshing } = useLibraryRefresh({
    refreshCatalog: refresh,
    refreshProgress,
  });

  const isLibraryRefreshing = isRefreshing || isRefetching;

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
      void refreshDownloads();
    }, [refreshBooks, refreshDownloads, refreshProgress]),
  );

  const downloadedIds = useMemo(
    () =>
      new Set(
        downloads.filter((d) => d.status === 'completed').map((d) => d.book_id),
      ),
    [downloads],
  );

  const downloadsByBookId = useMemo(() => {
    const map = new Map<string, DownloadRow>();
    for (const download of downloads) {
      map.set(download.book_id, download);
    }
    return map;
  }, [downloads]);

  const {
    filter,
    setFilter,
    visibleBooks,
    isFiltered,
  } = useLibraryFilters({
    books,
    remoteSearchData: remoteSearch.data,
    downloadedIds,
    searchQuery,
    progressByBookId,
  });

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
    ({ item, index }: { item: BookRow; index: number }) => {
      const download = downloadsByBookId.get(item.id) ?? null;
      const isOnDevice = downloadedIds.has(item.id);
      const dimmed = isOffline && !isOnDevice;

      return (
        <Box style={{ marginBottom: theme.grid.gap, paddingHorizontal: theme.grid.horizontalPadding }}>
          <BookCard
            book={item}
            width={cardWidth}
            isDownloaded={isOnDevice}
            download={download}
            readingProgress={progressByBookId.get(item.id)}
            dimmed={dimmed}
            index={index}
          />
        </Box>
      );
    },
    [cardWidth, downloadedIds, downloadsByBookId, isOffline, progressByBookId, theme.grid.gap, theme.grid.horizontalPadding],
  );

  const listHeader = useMemo(
    () => (
      <Box style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
        <Box position="relative" marginBottom="lg">
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('library.searchPlaceholder')}
          />
          {searchQuery.trim().length >= 2 && remoteSearch.isFetching ? (
            <ActivityIndicator
              color={theme.colors.textSecondary}
              size="small"
              style={{ position: 'absolute', right: 14, top: 14 }}
            />
          ) : null}
        </Box>
        <LibraryFilterBar
          filter={filter}
          setFilter={setFilter}
          isOffline={isOffline}
          isFiltered={isFiltered}
          onOpenFilter={() => router.push('/library-filter')}
        />
      </Box>
    ),
    [searchQuery, remoteSearch.isFetching, theme.colors.textSecondary, t, filter, setFilter, isOffline, isFiltered, router],
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
          <ThemedText color={theme.colors.textSecondary}>
            {t('library.connectServer')}
          </ThemedText>
        </PressableBox>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="background">
      <LibraryHeader
        subtitle={activeServer?.title ?? t('common.catalog')}
        isRefreshing={isLibraryRefreshing}
        onRefresh={() => void refreshLibrary()}
        onOpenSettings={() => router.push('/settings')}
        topInset={insets.top}
      />

      {isLoading || progressLoading ? (
        <Box flex={1} alignItems="center" justifyContent="center" padding="lg" gap="md">
          <ActivityIndicator color={theme.colors.text} />
        </Box>
      ) : (
        <FlashList
          data={visibleBooks}
          extraData={downloads}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={{ flex: 1, backgroundColor: 'transparent' }}
          refreshControl={
            <RefreshControl
              refreshing={isLibraryRefreshing}
              onRefresh={() => void refreshLibrary()}
              tintColor={theme.colors.textSecondary}
              progressViewOffset={insets.top + 78}
            />
          }
          ListHeaderComponent={listHeader}
          ListFooterComponent={visibleBooks.length > 0 ? listFooter : null}
          contentContainerStyle={{
            paddingTop: insets.top + 78,
            paddingBottom: insets.bottom + 24,
          }}
          scrollIndicatorInsets={{ top: insets.top + 78 }}
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
