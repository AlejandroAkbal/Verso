import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { BlurBackdrop } from '@/components/BlurBackdrop';
import { BookAboutSection } from '@/components/book/BookAboutSection';
import { BookDetailPrimaryAction } from '@/components/book/BookDetailPrimaryAction';
import { BookDetailQuickActions } from '@/components/book/BookDetailQuickActions';
import { BookBadge } from '@/components/BookBadge';
import { CoverProgressBar } from '@/components/CoverProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { getBookById } from '@/db/queries';
import type { BookRow } from '@/db/schema';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { useBookReadingProgress } from '@/hooks/useBookReadingProgress';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useServerAuthHeaders } from '@/hooks/useServerAuthHeaders';
import { parseBookCategories } from '@/hooks/useOPDSCatalog';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import { isNewBook } from '@/lib/bookIndicators';
import { isDownloadComplete } from '@/services/downloads/manage';
import { useTheme } from '@/theme/ThemeProvider';

export default function BookDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [book, setBook] = useState<BookRow | null>(null);
  const [loading, setLoading] = useState(true);
  const download = useDownloadStatus(id ?? '');
  const readingProgress = useBookReadingProgress(id ?? '');
  const { removeDownload } = useBackgroundDownload(id ?? '');
  const isDownloaded = isDownloadComplete(download);
  const authHeaders = useServerAuthHeaders(book?.server_id);

  const colors = useDominantColor(book?.cover_url, book?.blurhash);
  const percent = progressPercent(readingProgress ?? undefined);
  const finished = isFinished(readingProgress ?? undefined);
  const showProgress = percent != null && percent > 0;

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        if (!id) return;
        const row = await getBookById(db, id);
        setBook(row);
        setLoading(false);
      })();
    });
  }, [db, id]);

  const handleRemoveDownload = () => {
    if (!book) return;

    Alert.alert(
      t('downloads.removeTitle'),
      t('downloads.removeMessage', { title: book.title }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('downloads.remove'),
          style: 'destructive',
          onPress: () => {
            void removeDownload();
          },
        },
      ],
    );
  };

  if (loading || !book) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  const categories = parseBookCategories(book);
  const isNew = isNewBook(book, { isDownloaded, readingProgress });

  return (
    <BlurBackdrop
      imageUrl={book.cover_url}
      imageHeaders={authHeaders}
      dominantColor={colors.dominant}
    >
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <View style={styles.coverWrap}>
            <Image
              source={{
                uri: book.cover_url,
                headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
              }}
              style={styles.cover}
              contentFit="cover"
              transition={300}
            />
            {showProgress && !finished ? (
              <CoverProgressBar percent={percent ?? 0} />
            ) : null}
            {isNew ? <BookBadge label={t('book.new')} /> : null}
          </View>

          <View style={styles.heroText}>
            <ThemedText variant="title" style={styles.title}>
              {book.title}
            </ThemedText>
            {book.author ? (
              <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
                {book.author}
              </ThemedText>
            ) : null}
            {showProgress && !finished ? (
              <ThemedText variant="caption" color={theme.colors.textMuted}>
                {t('progress.percent', { percent: percent ?? 0 })}
              </ThemedText>
            ) : null}
          </View>
        </View>

        <View style={styles.actionBlock}>
          <BookDetailPrimaryAction
            bookId={book.id}
            onRead={() => router.push(`/reader/${book.id}`)}
            continuePercent={percent}
            isFinished={finished}
          />
          <BookDetailQuickActions
            book={book}
            download={download}
            isDownloaded={isDownloaded}
            onRemoveDownload={handleRemoveDownload}
          />
        </View>

        <BookAboutSection summary={book.summary} categories={categories} />
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
    paddingHorizontal: 20,
    gap: 28,
  },
  backButton: {
    alignSelf: 'flex-start',
    padding: 4,
    marginBottom: 4,
  },
  hero: {
    alignItems: 'center',
    gap: 20,
  },
  coverWrap: {
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.45,
    shadowRadius: 24,
    elevation: 12,
  },
  cover: {
    width: 168,
    height: 252,
    borderRadius: 12,
  },
  heroText: {
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 8,
  },
  title: {
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  actionBlock: {
    gap: 16,
  },
});
