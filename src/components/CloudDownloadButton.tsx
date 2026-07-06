import { SymbolView } from 'expo-symbols';

import { Box, PressableBox } from '@/components/ui';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { lightImpactHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';
import { ProgressRing } from './ProgressRing';

type CloudDownloadButtonProps = {
  bookId: string;
  size?: number;
};

export function CloudDownloadButton({ bookId, size = 28 }: CloudDownloadButtonProps) {
  const theme = useTheme();
  const { isDownloading, isCompleted, isFailed, progress, startDownload } =
    useBackgroundDownload(bookId);

  if (isCompleted) {
    return null;
  }

  if (isDownloading) {
    return (
      <Box
        alignItems="center"
        justifyContent="center"
        borderRadius="full"
        backgroundColor="overlay"
        width={size}
        height={size}
      >
        <ProgressRing progress={progress} size={size} />
      </Box>
    );
  }

  if (isFailed) {
    return (
      <PressableBox
        alignItems="center"
        justifyContent="center"
        borderRadius="full"
        backgroundColor="overlay"
        width={size}
        height={size}
        onPress={(event) => {
          event.stopPropagation();
          void lightImpactHaptic();
          void startDownload();
        }}
        hitSlop={8}
        testID={`book-download-retry-${bookId}`}
        accessibilityLabel="Download failed, tap to retry"
      >
        <SymbolView
          name="exclamationmark.icloud"
          size={size - 4}
          tintColor={theme.colors.error}
        />
      </PressableBox>
    );
  }

  return (
    <PressableBox
      alignItems="center"
      justifyContent="center"
      borderRadius="full"
      backgroundColor="overlay"
      width={size}
      height={size}
      onPress={(event) => {
        event.stopPropagation();
        void lightImpactHaptic();
        void startDownload();
      }}
      hitSlop={8}
      testID={`book-download-${bookId}`}
    >
      <SymbolView
        name="icloud.and.arrow.down"
        size={size - 4}
        tintColor={theme.colors.text}
      />
    </PressableBox>
  );
}
