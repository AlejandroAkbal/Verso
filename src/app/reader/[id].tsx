import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/ThemedText';
import {
  getBookById,
  getDownloadByBookId,
  getReadingProgress,
  upsertReadingProgress,
} from '@/db/queries';
import {
  charsPerPageForFontSize,
  loadBookContent,
  paginateText,
} from '@/services/reader/content';
import { useTheme } from '@/theme/ThemeProvider';
import { theme as appTheme } from '@/theme/theme';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>(['']);
  const [currentPage, setCurrentPage] = useState(0);
  const [fontSize, setFontSize] = useState<number>(appTheme.reader.fontSizeDefault);
  const [chromeVisible, setChromeVisible] = useState(true);
  const [title, setTitle] = useState('');

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        if (!id) return;

        try {
          const book = await getBookById(db, id);
          const download = await getDownloadByBookId(db, id);
          const saved = await getReadingProgress(db, id);

          if (!book || !download?.local_uri) {
            setError(t('reader.bookNotDownloaded'));
            setLoading(false);
            return;
          }

          const content = await loadBookContent(download.local_uri, book.mime);
          const charsPerPage = charsPerPageForFontSize(
            saved?.font_size ?? appTheme.reader.fontSizeDefault,
          );
          const paginated = paginateText(content.plainText, charsPerPage);

          setTitle(content.title || book.title);
          setPages(paginated);
          setFontSize(saved?.font_size ?? appTheme.reader.fontSizeDefault);
          setCurrentPage(
            saved?.position != null
              ? Math.min(saved.position, paginated.length - 1)
              : 0,
          );
        } catch (err) {
          setError(err instanceof Error ? err.message : t('reader.loadFailed'));
        } finally {
          setLoading(false);
        }
      })();
    });
  }, [db, id, t]);

  const persistProgress = useCallback(
    async (page: number, size: number) => {
      if (!id) return;
      await upsertReadingProgress(db, {
        book_id: id,
        position: page,
        total: pages.length,
        font_size: size,
        updated_at: Date.now(),
      });
    },
    [db, id, pages.length],
  );

  const goToPage = useCallback(
    (page: number) => {
      const clamped = Math.max(0, Math.min(page, pages.length - 1));
      setCurrentPage(clamped);
      void persistProgress(clamped, fontSize);
    },
    [fontSize, pages.length, persistProgress],
  );

  const adjustFontSize = useCallback(
    (delta: number) => {
      const next = Math.max(
        appTheme.reader.fontSizeMin,
        Math.min(appTheme.reader.fontSizeMax, fontSize + delta),
      );
      setFontSize(next);
      const charsPerPage = charsPerPageForFontSize(next);
      const ratio = currentPage / Math.max(pages.length - 1, 1);
      const repaginated = paginateText(pages.join('\n\n'), charsPerPage);
      const newPage = Math.round(ratio * Math.max(repaginated.length - 1, 0));
      setPages(repaginated);
      setCurrentPage(newPage);
      void persistProgress(newPage, next);
    },
    [currentPage, fontSize, pages, persistProgress],
  );

  const progressPercent = useMemo(() => {
    if (pages.length <= 1) return 0;
    return Math.round((currentPage / (pages.length - 1)) * 100);
  }, [currentPage, pages.length]);

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={[styles.centered, { backgroundColor: theme.colors.background }]}>
        <ThemedText color={theme.colors.error}>{error}</ThemedText>
        <Pressable onPress={() => router.back()}>
          <ThemedText color={theme.colors.textSecondary}>{t('common.goBack')}</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {chromeVisible ? (
        <View style={[styles.chrome, { paddingTop: insets.top + 8 }]}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
          </Pressable>
          <ThemedText variant="caption" color={theme.colors.textSecondary} numberOfLines={1}>
            {title}
          </ThemedText>
          <ThemedText variant="caption" color={theme.colors.textMuted}>
            {progressPercent}%
          </ThemedText>
        </View>
      ) : null}

      <Pressable
        style={styles.pageContainer}
        onPress={() => setChromeVisible((v) => !v)}
      >
        <Pressable style={styles.tapZoneLeft} onPress={() => goToPage(currentPage - 1)} />
        <View style={styles.pageContent}>
          <ThemedText
            style={{
              fontSize,
              lineHeight: fontSize * appTheme.reader.lineHeightMultiplier,
            }}
          >
            {pages[currentPage]}
          </ThemedText>
        </View>
        <Pressable style={styles.tapZoneRight} onPress={() => goToPage(currentPage + 1)} />
      </Pressable>

      {chromeVisible ? (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable onPress={() => adjustFontSize(-2)} hitSlop={12}>
            <SymbolView name="textformat.size.smaller" size={20} tintColor={theme.colors.textSecondary} />
          </Pressable>
          <ThemedText variant="caption" color={theme.colors.textMuted}>
            {currentPage + 1} / {pages.length}
          </ThemedText>
          <Pressable onPress={() => adjustFontSize(2)} hitSlop={12}>
            <SymbolView name="textformat.size.larger" size={20} tintColor={theme.colors.textSecondary} />
          </Pressable>
        </View>
      ) : null}
    </View>
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
    gap: 16,
  },
  chrome: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  pageContainer: {
    flex: 1,
    flexDirection: 'row',
  },
  tapZoneLeft: {
    width: '25%',
    height: '100%',
  },
  tapZoneRight: {
    width: '25%',
    height: '100%',
  },
  pageContent: {
    flex: 1,
    paddingHorizontal: appTheme.reader.paddingHorizontal,
    paddingVertical: appTheme.reader.paddingVertical,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 8,
  },
});
