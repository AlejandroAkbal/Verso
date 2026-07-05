import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
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
  const progressByBookId = useReadingProgressMap();
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { books, isOffline, isLoading, isRefetching, refresh, error, searchUrl } =
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
        <View style={{ marginBottom: theme.grid.gap }}>
          <BookCard
            book={item}
            width={cardWidth}
            readingProgress={progressByBookId.get(item.id)}
            dimmed={dimmed}
          />
        </View>
      );
    },
    [cardWidth, downloadedIds, isOffline, progressByBookId, theme.grid.gap],
  );

  const listHeader = useMemo(
    () => (
      <View style={styles.listHeader}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScroll}
          contentContainerStyle={styles.filterRow}
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
            <View style={[styles.filterDivider, { backgroundColor: theme.colors.border }]} />
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
        </ScrollView>
        <OfflineBanner visible={isOffline} />
      </View>
    ),
    [categoryFilter, categoryOptions, filter, isOffline, t, theme.colors.border],
  );

  if (serversLoading || activeServerLoading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (servers.length === 0) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ThemedText variant="subtitle">{t('library.noLibrary')}</ThemedText>
        <ThemedText variant="body" color={theme.colors.textSecondary} style={styles.emptyCopy}>
          {t('library.noLibraryHint')}
        </ThemedText>
        <Pressable onPress={() => router.push('/settings')} style={styles.linkButton}>
          <ThemedText color={theme.colors.textSecondary}>{t('library.connectServer')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  const isSearching = searchQuery.trim().length >= 2 && remoteSearch.isFetching;

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.chrome, { paddingTop: insets.top + 4 }]}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <ThemedText style={styles.largeTitle}>{t('library.title')}</ThemedText>
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              {activeServer?.title ?? t('common.catalog')}
            </ThemedText>
          </View>
          <Pressable
            onPress={() => router.push('/settings')}
            style={[styles.iconButton, { backgroundColor: theme.colors.surfaceElevated }]}
            hitSlop={8}
          >
            <SymbolView name="gearshape" size={18} tintColor={theme.colors.textSecondary} />
          </Pressable>
        </View>

        <View style={styles.searchWrap}>
          <SearchField
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('library.searchPlaceholder')}
          />
          {isSearching ? (
            <ActivityIndicator
              color={theme.colors.textSecondary}
              size="small"
              style={styles.searchSpinner}
            />
          ) : null}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.text} />
        </View>
      ) : (
        <FlashList
          data={visibleBooks}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          style={styles.list}
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
            <View style={styles.emptyState}>
              <ThemedText color={theme.colors.textSecondary}>
                {filter === 'on-device'
                  ? t('library.emptyDownloaded')
                  : searchQuery.trim()
                    ? t('library.emptySearch')
                    : (error ?? t('library.emptyCatalog'))}
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  chrome: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  headerText: {
    flex: 1,
    gap: 4,
    paddingRight: 12,
  },
  largeTitle: {
    fontSize: 34,
    fontWeight: '700',
    lineHeight: 40,
    letterSpacing: -0.4,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  searchWrap: {
    position: 'relative',
  },
  searchSpinner: {
    position: 'absolute',
    right: 14,
    top: 14,
  },
  listHeader: {
    paddingTop: 4,
    paddingBottom: 12,
    gap: 8,
  },
  filterScroll: {
    flexGrow: 0,
    flexShrink: 0,
    maxHeight: 44,
    marginHorizontal: -4,
  },
  filterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  filterDivider: {
    width: StyleSheet.hairlineWidth,
    height: 20,
    marginHorizontal: 2,
  },
  list: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  linkButton: {
    padding: 8,
  },
  emptyCopy: {
    textAlign: 'center',
    paddingHorizontal: 24,
  },
});
