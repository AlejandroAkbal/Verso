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
  const { isDownloading, isCompleted, progress, startDownload } =
    useBackgroundDownload(bookId);

  // Downloaded books show no chrome on the cover — absence of the cloud is the signal
  // (Apple Books / Infuse pattern). Progress bar + detail screen carry read state.
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
    >
      <SymbolView
        name="icloud.and.arrow.down"
        size={size - 4}
        tintColor={theme.colors.text}
      />
    </PressableBox>
  );
}
