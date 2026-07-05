import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { useTranslation } from 'react-i18next';

import type { BookRow, ReadingProgressRow } from '@/db/schema';
import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { useServerAuthHeaders } from '@/hooks/useServerAuthHeaders';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import { isNewBook } from '@/lib/bookIndicators';
import { isDownloadComplete } from '@/services/downloads/manage';
import { useTheme } from '@/theme/ThemeProvider';
import { BookBadge } from './BookBadge';
import { CloudDownloadButton } from './CloudDownloadButton';
import { CoverProgressBar } from './CoverProgressBar';
import { ThemedText } from './ThemedText';

type BookCardProps = {
  book: BookRow;
  width: number;
  readingProgress?: ReadingProgressRow;
  /** Reduced opacity when the book is unavailable offline. */
  dimmed?: boolean;
};

export function BookCard({ book, width, readingProgress, dimmed = false }: BookCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const authHeaders = useServerAuthHeaders(book.server_id);
  const download = useDownloadStatus(book.id);
  const isOnDevice = isDownloadComplete(download);
  const height = width / theme.cover.aspectRatio;
  const percent = progressPercent(readingProgress);
  const finished = isFinished(readingProgress);
  const inProgress = percent != null && percent > 0 && !finished;
  const showProgress = inProgress;
  const isNew = isNewBook(book, { isDownloaded: isOnDevice, readingProgress });

  return (
    <View
      style={[
        styles.wrapper,
        { width },
        dimmed && styles.dimmed,
        finished && { opacity: theme.colors.finishedOpacity },
      ]}
    >
      <View style={[styles.container, { width, height }]}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={() => router.push(`/book/${book.id}`)}
        >
          <Image
            key={book.cover_url + JSON.stringify(authHeaders)}
            source={{
              uri: book.cover_url,
              headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
            }}
            style={[styles.cover, { borderRadius: theme.cover.borderRadius }]}
            contentFit="cover"
            placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
            transition={200}
          />
        </Pressable>
        {showProgress ? <CoverProgressBar percent={percent ?? 0} /> : null}
        {isNew ? <BookBadge label={t('book.new')} /> : null}
        {!isOnDevice ? (
          <View style={styles.cloudButton}>
            <CloudDownloadButton bookId={book.id} />
          </View>
        ) : null}
      </View>
      {inProgress ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.progressLabel}>
          {t('progress.percent', { percent: percent ?? 0 })}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 4,
  },
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  dimmed: {
    opacity: 0.35,
  },
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141414',
  },
  cloudButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
  progressLabel: {
    textAlign: 'center',
    fontSize: 11,
  },
});
