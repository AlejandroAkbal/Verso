import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useSQLiteContext } from 'expo-sqlite';

import { BlurBackdrop } from '@/components/BlurBackdrop';
import { ThemedText } from '@/components/ThemedText';
import { CloudDownloadButton } from '@/components/CloudDownloadButton';
import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { getBookById } from '@/db/queries';
import type { BookRow } from '@/db/schema';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useTheme } from '@/theme/ThemeProvider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const download = useDownloadStatus(id ?? '');
  const isDownloaded = download?.status === 'completed';

  const colors = useDominantColor(book?.cover_url, book?.blurhash);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const row = await getBookById(db, id);
      setBook(row);
      setLoading(false);
    }
    void load();
  }, [db, id]);

  if (loading || !book) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  return (
    <BlurBackdrop imageUrl={book.cover_url} dominantColor={colors.dominant}>
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 32 },
        ]}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <SymbolView name="chevron.left" size={20} tintColor={theme.colors.text} />
          <ThemedText variant="body">Back</ThemedText>
        </Pressable>

        <View style={styles.coverContainer}>
          <Image
            source={{ uri: book.cover_url }}
            style={styles.cover}
            contentFit="contain"
            transition={300}
          />
        </View>

        <View style={styles.metadata}>
          <ThemedText variant="title">{book.title}</ThemedText>
          {book.author ? (
            <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
              {book.author}
            </ThemedText>
          ) : null}
          {book.summary ? (
            <ThemedText variant="body" color={theme.colors.textSecondary} style={styles.summary}>
              {book.summary.replace(/<[^>]+>/g, '')}
            </ThemedText>
          ) : null}
        </View>

        <View style={styles.actions}>
          <CloudDownloadButton bookId={book.id} size={36} />
          {isDownloaded ? (
            <Pressable
              style={[styles.readButton, { backgroundColor: theme.colors.text }]}
              onPress={() => router.push(`/reader/${book.id}`)}
            >
              <ThemedText variant="subtitle" color={theme.colors.background}>
                Read
              </ThemedText>
            </Pressable>
          ) : (
            <ThemedText variant="caption" color={theme.colors.textMuted}>
              Download to read offline
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </BlurBackdrop>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    paddingHorizontal: 24,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 24,
  },
  coverContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  cover: {
    width: 220,
    height: 330,
    borderRadius: 12,
  },
  metadata: {
    gap: 8,
    marginBottom: 32,
  },
  summary: {
    marginTop: 8,
    lineHeight: 24,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  readButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 9999,
  },
});
