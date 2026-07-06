import { SymbolView } from 'expo-symbols';
import { ActivityIndicator } from 'react-native';
import Animated from 'react-native-reanimated';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import { DownloadingPercentText } from '@/components/DownloadingPercentText';
import { useDownloadPresentation } from '@/hooks/useDownloadPresentation';
import { formatDownloadError } from '@/lib/downloadErrors';
import { lightImpactHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type BookDetailPrimaryActionProps = {
  bookId: string;
  onRead: () => void;
  isOpening?: boolean;
  continuePercent: number | null;
  isFinished: boolean;
};

export function BookDetailPrimaryAction({
  bookId,
  onRead,
  isOpening = false,
  continuePercent,
  isFinished,
}: BookDetailPrimaryActionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const {
    download,
    showDownloadButton,
    showProgressChrome,
    showSuccessChrome,
    showCompletedUI,
    showFailedUI,
    animatedProgress,
    settleStyle,
    startDownload,
  } = useDownloadPresentation(bookId);

  if (showCompletedUI) {
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
        disabled={isOpening}
        opacity={isOpening ? 0.7 : 1}
        onPress={() => {
          if (isOpening) return;
          void lightImpactHaptic();
          onRead();
        }}
        testID="book-detail-read"
      >
        {isOpening ? (
          <ActivityIndicator color={theme.colors.onPrimary} size="small" />
        ) : (
          <SymbolView name="book.fill" size={18} tintColor={theme.colors.onPrimary} />
        )}
        <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
          {label}
        </ThemedText>
      </PressableBox>
    );
  }

  if (showSuccessChrome) {
    return (
      <Animated.View style={settleStyle}>
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
          testID="book-detail-download-success"
          accessibilityLabel={t('book.downloadComplete')}
        >
          <SymbolView
            name="checkmark"
            size={18}
            tintColor={theme.colors.text}
            weight="semibold"
          />
          <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
            {t('book.downloadComplete')}
          </ThemedText>
        </Box>
      </Animated.View>
    );
  }

  if (showProgressChrome) {
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
        accessibilityLabel={t('book.downloading', { percent: 100 })}
      >
        <ProgressRing animatedProgress={animatedProgress} size={22} strokeWidth={2} />
        <DownloadingPercentText
          animatedProgress={animatedProgress}
          label={(percent) => t('book.downloading', { percent })}
        />
      </Box>
    );
  }

  if (showFailedUI) {
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

  if (showDownloadButton) {
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

  return null;
}
