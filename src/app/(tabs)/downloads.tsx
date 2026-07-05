import { useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { FlashList } from '@shopify/flash-list';
import { Image } from 'expo-image';
import { useSQLiteContext } from 'expo-sqlite';

import { ProgressRing } from '@/components/ProgressRing';
import { ThemedText } from '@/components/ThemedText';
import { useDownloads } from '@/db/hooks/useDownloads';
import { getBookById } from '@/db/queries';
import type { BookRow, DownloadRow } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';

export default function DownloadsScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { downloads, loading } = useDownloads();

  const enrichedDownloads = useMemo(() => {
    return downloads;
  }, [downloads]);

  const loadBook = useCallback(
    async (bookId: string) => getBookById(db, bookId),
    [db],
  );

  const renderItem = useCallback(
    ({ item }: { item: DownloadRow }) => (
      <DownloadRowItem
        download={item}
        onPress={() => {
          if (item.status === 'completed') {
            router.push(`/reader/${item.book_id}`);
          } else {
            router.push(`/book/${item.book_id}`);
          }
        }}
        loadBook={loadBook}
      />
    ),
    [loadBook, router],
  );

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={enrichedDownloads}
        renderItem={renderItem}
        keyExtractor={(item) => item.book_id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.centered}>
            <ThemedText color={theme.colors.textSecondary}>
              No downloads yet. Tap the cloud icon on any book to start.
            </ThemedText>
          </View>
        }
      />
    </View>
  );
}

function DownloadRowItem({
  download,
  onPress,
  loadBook,
}: {
  download: DownloadRow;
  onPress: () => void;
  loadBook: (bookId: string) => Promise<BookRow | null>;
}) {
  const theme = useTheme();
  const [book, setBook] = useState<BookRow | null>(null);

  useEffect(() => {
    void loadBook(download.book_id).then(setBook);
  }, [download.book_id, loadBook]);

  const statusLabel =
    download.status === 'completed'
      ? 'Ready'
      : download.status === 'failed'
        ? 'Failed'
        : download.status === 'downloading'
          ? `${Math.round(download.progress * 100)}%`
          : 'Queued';

  return (
    <Pressable
      style={[styles.row, { borderColor: theme.colors.border }]}
      onPress={onPress}
    >
      <Image
        source={{ uri: book?.cover_url }}
        style={styles.thumbnail}
        contentFit="cover"
      />
      <View style={styles.rowContent}>
        <ThemedText variant="subtitle" numberOfLines={1}>
          {book?.title ?? 'Loading…'}
        </ThemedText>
        <ThemedText variant="caption" color={theme.colors.textSecondary}>
          {statusLabel}
        </ThemedText>
        {download.error ? (
          <ThemedText variant="caption" color={theme.colors.error} numberOfLines={1}>
            {download.error}
          </ThemedText>
        ) : null}
      </View>
      {download.status === 'downloading' || download.status === 'queued' ? (
        <ProgressRing progress={download.progress} size={32} />
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  thumbnail: {
    width: 48,
    height: 72,
    borderRadius: 6,
    backgroundColor: '#141414',
  },
  rowContent: {
    flex: 1,
    gap: 4,
  },
});
