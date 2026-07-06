import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { formatDownloadError } from '@/lib/downloadErrors';
import { lightImpactHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type BookDetailPrimaryActionProps = {
  bookId: string;
  onRead: () => void;
  continuePercent: number | null;
  isFinished: boolean;
};

export function BookDetailPrimaryAction({
  bookId,
  onRead,
  continuePercent,
  isFinished,
}: BookDetailPrimaryActionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { download, isDownloading, isCompleted, isFailed, progress, startDownload } =
    useBackgroundDownload(bookId);

  if (isCompleted) {
    const label =
      continuePercent != null && continuePercent > 0 && !isFinished
        ? t('book.continueReading', { percent: continuePercent })
        : t('book.read');

    return (
      <PressableBox
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="sm"
        minHeight={50}
        borderRadius="full"
        paddingHorizontal="lg"
        backgroundColor="primary"
        onPress={() => {
          void lightImpactHaptic();
          onRead();
        }}
        testID="book-detail-read"
      >
        <SymbolView name="book.fill" size={18} tintColor={theme.colors.onPrimary} />
        <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
          {label}
        </ThemedText>
      </PressableBox>
    );
  }

  if (isDownloading) {
    const percent = Math.round(progress * 100);
    return (
      <Box
        flexDirection="row"
        alignItems="center"
        justifyContent="center"
        gap="sm"
        minHeight={50}
        borderRadius="full"
        paddingHorizontal="lg"
        borderWidth={0.5}
        borderColor="border"
        testID="book-detail-downloading"
        accessibilityLabel={t('book.downloading', { percent })}
      >
        <ProgressRing progress={progress} size={22} strokeWidth={2} />
        <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
          {t('book.downloading', { percent })}
        </ThemedText>
      </Box>
    );
  }

  if (isFailed) {
    const errorMessage = download?.error
      ? formatDownloadError(t, download.error)
      : t('downloads.errorUnknown');

    return (
      <Box gap="sm">
        <PressableBox
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap="sm"
          minHeight={50}
          borderRadius="full"
          paddingHorizontal="lg"
          borderColor="error"
          borderWidth={1}
          onPress={() => {
            void lightImpactHaptic();
            void startDownload();
          }}
          testID="book-detail-download-retry"
        >
          <SymbolView name="arrow.clockwise" size={18} tintColor={theme.colors.error} />
          <ThemedText variant="subtitle" color={theme.colors.error}>
            {t('book.downloadFailed')}
          </ThemedText>
        </PressableBox>
        <ThemedText
          variant="caption"
          color={theme.colors.error}
          testID="book-detail-download-error"
          accessibilityLiveRegion="polite"
          style={{ textAlign: 'center', lineHeight: 18 }}
        >
          {errorMessage}
        </ThemedText>
      </Box>
    );
  }

  return (
    <PressableBox
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      gap="sm"
      minHeight={50}
      borderRadius="full"
      paddingHorizontal="lg"
      backgroundColor="primary"
      onPress={() => {
        void lightImpactHaptic();
        void startDownload();
      }}
      testID="book-detail-download"
    >
      <SymbolView name="icloud.and.arrow.down" size={18} tintColor={theme.colors.onPrimary} />
      <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
        {t('book.download')}
      </ThemedText>
    </PressableBox>
  );
}
