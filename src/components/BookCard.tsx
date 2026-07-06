import { useRouter } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Box, ImageBox, PressableBox } from '@/components/ui';
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
  const coverKey = book.cover_url + JSON.stringify(authHeaders);
  const [loadedCoverKey, setLoadedCoverKey] = useState(book.cover_url ? '' : coverKey);
  const coverLoaded = loadedCoverKey === coverKey;
  const percent = progressPercent(readingProgress);
  const finished = isFinished(readingProgress);
  const inProgress = percent != null && percent > 0 && !finished;
  const showProgress = inProgress;
  const isNew = isNewBook(book, {
    isDownloaded: isOnDevice,
    readingProgress,
    downloadStatus: download?.status,
  });

  return (
    <Box
      gap="xs"
      opacity={
        dimmed ? theme.opacity.dimmed : finished ? theme.opacity.finished : 1
      }
      width={width}
    >
      <Box position="relative" overflow="hidden" width={width} height={height}>
        <PressableBox
          position="absolute"
          top={0}
          right={0}
          bottom={0}
          left={0}
          onPress={() => router.push(`/book/${book.id}`)}
        >
          {!coverLoaded ? (
            <Box
              position="absolute"
              top={0}
              right={0}
              bottom={0}
              left={0}
              backgroundColor="surfaceElevated"
              borderRadius="md"
            />
          ) : null}
          <ImageBox
            key={coverKey}
            source={{
              uri: book.cover_url,
              headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
            }}
            width="100%"
            height="100%"
            backgroundColor="surface"
            borderRadius="md"
            contentFit="cover"
            placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
            transition={200}
            onLoad={() => setLoadedCoverKey(coverKey)}
            onError={() => setLoadedCoverKey(coverKey)}
          />
        </PressableBox>
        {showProgress ? <CoverProgressBar percent={percent ?? 0} /> : null}
        {isNew ? <BookBadge label={t('book.new')} /> : null}
        {!isOnDevice ? (
          <Box position="absolute" bottom={6} right={6}>
            <CloudDownloadButton bookId={book.id} />
          </Box>
        ) : null}
      </Box>
      {inProgress ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textMuted}
          style={{ textAlign: 'center', fontSize: 11 }}
        >
          {t('progress.percent', { percent: percent ?? 0 })}
        </ThemedText>
      ) : null}
    </Box>
  );
}
