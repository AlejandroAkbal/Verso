import { SymbolView } from 'expo-symbols';
import Animated from 'react-native-reanimated';

import { Box, PressableBox } from '@/components/ui';
import { ProgressRing } from '@/components/ProgressRing';
import type { DownloadRow } from '@/db/schema';
import { useDownloadController } from '@/hooks/useDownloadController';
import { lightImpactHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type CloudDownloadButtonProps = {
  bookId: string;
  size?: number;
  download?: DownloadRow | null;
};

export function CloudDownloadButton({
  bookId,
  size = 28,
  download = null,
}: CloudDownloadButtonProps) {
  const theme = useTheme();
  const {
    showDownloadButton,
    showProgressChrome,
    showSuccessChrome,
    showFailedUI,
    animatedProgress,
    settleStyle,
    startDownload,
  } = useDownloadController(bookId, { download });

  if (showProgressChrome) {
    return (
      <Box
        alignItems="center"
        justifyContent="center"
        borderRadius="full"
        backgroundColor="overlay"
        width={size}
        height={size}
      >
        <ProgressRing animatedProgress={animatedProgress} size={size} />
      </Box>
    );
  }

  if (showSuccessChrome) {
    return (
      <Animated.View style={settleStyle}>
        <Box
          alignItems="center"
          justifyContent="center"
          borderRadius="full"
          backgroundColor="overlay"
          width={size}
          height={size}
          testID={`book-download-success-${bookId}`}
          accessibilityLabel="Downloaded"
        >
          <SymbolView
            name="checkmark"
            size={size * 0.42}
            tintColor={theme.colors.text}
            weight="semibold"
          />
        </Box>
      </Animated.View>
    );
  }

  if (showFailedUI) {
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

  if (showDownloadButton) {
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

  return null;
}
