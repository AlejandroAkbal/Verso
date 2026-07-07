import Animated, { FadeInDown, Easing } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Box, ImageBox, PressableBox } from '@/components/ui';
import { coverFrameStyle, coverGlowStyle } from '@/lib/coverStyle';
import { coverColorFromBlurhash } from '@/hooks/useCoverColor';
import type { BookRow, DownloadRow, ReadingProgressRow } from '@/db/schema';
import { useServerAuthHeaders } from '@/hooks/useServerAuthHeaders';
import { isFinished, progressPercent } from '@/lib/readingProgress';
import { isNewBook } from '@/lib/bookIndicators';
import {
  resolveOnDevice,
  shouldShowGridDownloadControl,
} from '@/lib/downloadVisibility';
import { useTheme } from '@/theme/ThemeProvider';
import { BookBadge } from './BookBadge';
import {
  BookFinishedFooterBand,
  BookProgressFooterBand,
} from './BookProgressFooterBand';
import { CloudDownloadButton } from './CloudDownloadButton';

type BookCardProps = {
  book: BookRow;
  width: number;
  /** From library `downloadedIds` — authoritative for on-device state. */
  isDownloaded: boolean;
  download?: DownloadRow | null;
  readingProgress?: ReadingProgressRow;
  /** Reduced opacity when the book is unavailable offline. */
  dimmed?: boolean;
  /** List index — used for subtle stagger entrance animation. */
  index?: number;
};

export function BookCard({
  book,
  width,
  isDownloaded,
  download = null,
  readingProgress,
  dimmed = false,
  index = 0,
}: BookCardProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const router = useRouter();
  const authHeaders = useServerAuthHeaders(book.server_id);
  const isOnDevice = resolveOnDevice(isDownloaded, download);
  const showDownloadControl = shouldShowGridDownloadControl(book.id, isOnDevice, download);
  const coverHeight = width / theme.cover.aspectRatio;
  const coverKey = book.cover_url + JSON.stringify(authHeaders);
  const percent = progressPercent(readingProgress);
  const finished = isFinished(readingProgress);
  const inProgress = percent != null && percent > 0 && !finished;
  const isNew = isNewBook(book, {
    isDownloaded: isOnDevice,
    readingProgress,
    downloadStatus: download?.status,
  });

  const frameStyle = coverFrameStyle(theme);
  const glowStyle = coverGlowStyle(coverColorFromBlurhash(book.blurhash).glow);

  // Staggered FadeInDown — clean ease-out, no spring, no bounce.
  // 10px drop, 220ms, cubic ease-out. Cap stagger at 150ms so the grid
  // finishes as a cohesive wave rather than a slow sequence.
  const entranceDelay = Math.min(index * 30, 150);

  return (
    <Animated.View
      entering={FadeInDown
        .delay(entranceDelay)
        .duration(220)
        .easing(Easing.out(Easing.cubic))
      }
    >
      <Box
        opacity={
          dimmed ? theme.opacity.dimmed : finished ? theme.opacity.finished : 1
        }
        width={width}
      >
      {/* Jacket image — outer wrapper carries the color glow (no overflow clip) */}
      <Box width={width} style={glowStyle}>
      <Box overflow="hidden" width={width} style={frameStyle}>
        <Box position="relative" width={width} height={coverHeight}>
          <PressableBox
            position="absolute"
            top={0}
            right={0}
            bottom={0}
            left={0}
            onPress={() => router.push(`/book/${book.id}`)}
          >
            <ImageBox
              key={coverKey}
              source={{
                uri: book.cover_url,
                headers: Object.keys(authHeaders).length > 0 ? authHeaders : undefined,
              }}
              width="100%"
              height="100%"
              backgroundColor="surfaceElevated"
              contentFit="cover"
              placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
              transition={200}
            />
          </PressableBox>
          {isNew ? <BookBadge label={t('book.new')} /> : null}
          {showDownloadControl ? (
            <Box position="absolute" right={6} bottom={6}>
              <CloudDownloadButton
                key={book.id}
                bookId={book.id}
                download={download}
              />
            </Box>
          ) : null}
        </Box>
      </Box>
      </Box>

      {/* Below-cover progress — fixed height container ensures grid cells are uniform */}
      <Box height={19}>
        {inProgress ? (
          <BookProgressFooterBand percent={percent ?? 0} />
        ) : finished ? (
          <BookFinishedFooterBand label={t('progress.finished')} />
        ) : null}
      </Box>
    </Box>
    </Animated.View>
  );
}
