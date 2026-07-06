import { useLocalSearchParams, useRouter, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { BlurBackdrop } from '@/components/BlurBackdrop';
import { BookAboutSection } from '@/components/book/BookAboutSection';
import { BookDetailPrimaryAction } from '@/components/book/BookDetailPrimaryAction';
import { BookDetailQuickActions } from '@/components/book/BookDetailQuickActions';
import { CoverProgressBar } from '@/components/CoverProgressBar';
import { ThemedText } from '@/components/ThemedText';
import { Box, ImageBox, PressableBox, ScrollBox } from '@/components/ui';
import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { acknowledgeBook, getBookById } from '@/db/queries';
import type { BookRow } from '@/db/schema';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { useBookReadingProgress } from '@/hooks/useBookReadingProgress';
import { useDominantColor } from '@/hooks/useDominantColor';
import { useServerAuthHeaders } from '@/hooks/useServerAuthHeaders';
import { parseBookCategories } from '@/hooks/useOPDSCatalog';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import { promptSyncConflict } from '@/lib/syncPrompt';
import { isDownloadComplete } from '@/services/downloads/manage';
import {
  applyRemotePercentage,
  pullRemoteProgressForBook,
} from '@/services/koreader/syncBook';
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
  const { progress: readingProgress, refresh: refreshProgress } = useBookReadingProgress(id ?? '');
  const { removeDownload } = useBackgroundDownload(id ?? '');
  const isDownloaded = isDownloadComplete(download);
  const authHeaders = useServerAuthHeaders(book?.server_id);
  const [loadedCoverUrl, setLoadedCoverUrl] = useState('');

  const colors = useDominantColor(book?.cover_url, book?.blurhash);
  const percent = progressPercent(readingProgress ?? undefined);
  const finished = isFinished(readingProgress ?? undefined);
  const showProgress = percent != null && percent > 0;

  useFocusEffect(
    useCallback(() => {
      if (!id) return;
      void (async () => {
        await acknowledgeBook(db, id);
        const row = await getBookById(db, id);
        setBook(row);
        setLoading(false);
        await refreshProgress();
      })();
    }, [db, id, refreshProgress]),
  );

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

  const handleRead = () => {
    if (!book) return;

    void (async () => {
      const pull = await pullRemoteProgressForBook(db, book.id);
      const navigate = () => router.push(`/reader/${book.id}`);

      if (pull.hasConflict && pull.remote) {
        promptSyncConflict(
          t,
          () => {
            void applyRemotePercentage(db, book.id, pull.remote!.percentage).then(navigate);
          },
          navigate,
        );
        return;
      }

      navigate();
    })();
  };

  if (loading || !book) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
      >
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  const categories = parseBookCategories(book);
  const coverLoaded = loadedCoverUrl === book.cover_url;

  return (
    <BlurBackdrop
      imageUrl={book.cover_url}
      imageHeaders={authHeaders}
      dominantColor={colors.dominant}
    >
      <ScrollBox
        contentContainerStyle={{
          paddingHorizontal: 20,
          gap: 28,
          paddingTop: insets.top + 8,
          paddingBottom: insets.bottom + 32,
        }}
        showsVerticalScrollIndicator={false}
      >
        <PressableBox
          onPress={() => router.back()}
          alignSelf="flex-start"
          padding="xs"
          marginBottom="xs"
          hitSlop={12}
        >
          <SymbolView name="chevron.left" size={18} tintColor={theme.colors.text} />
        </PressableBox>

        <Box alignItems="center" gap="lg">
          <Box
            borderRadius="lg"
            overflow="hidden"
            shadowColor="background"
            shadowOffset={{ width: 0, height: 12 }}
            shadowOpacity={0.45}
            shadowRadius={24}
            elevation={12}
          >
            {!coverLoaded ? (
              <Box
                position="absolute"
                top={0}
                right={0}
                bottom={0}
                left={0}
                backgroundColor="surfaceElevated"
                borderRadius="lg"
              />
            ) : null}
            <ImageBox
              source={{
                uri: book.cover_url,
                headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
              }}
              width={168}
              height={252}
              borderRadius="lg"
              contentFit="cover"
              transition={300}
              onLoad={() => setLoadedCoverUrl(book.cover_url)}
              onError={() => setLoadedCoverUrl(book.cover_url)}
            />
            {showProgress && !finished ? (
              <CoverProgressBar percent={percent ?? 0} />
            ) : null}
          </Box>

          <Box alignItems="center" gap="xs" paddingHorizontal="sm">
            <ThemedText
              variant="title"
              style={{ letterSpacing: -0.3, textAlign: 'center' }}
            >
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
          </Box>
        </Box>

        <Box gap="md">
          <BookDetailPrimaryAction
            bookId={book.id}
            onRead={handleRead}
            continuePercent={percent}
            isFinished={finished}
          />
          <BookDetailQuickActions
            book={book}
            download={download}
            isDownloaded={isDownloaded}
            onRemoveDownload={handleRemoveDownload}
          />
        </Box>

        <BookAboutSection summary={book.summary} categories={categories} />
      </ScrollBox>
    </BlurBackdrop>
  );
}
