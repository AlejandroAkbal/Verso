import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
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
      <View style={[styles.button, { width: size, height: size }]}>
        <ProgressRing progress={progress} size={size} />
      </View>
    );
  }

  return (
    <Pressable
      style={[styles.button, { width: size, height: size }]}
      onPress={(event) => {
        event.stopPropagation();
        void startDownload();
      }}
      hitSlop={8}
    >
      <SymbolView
        name="icloud.and.arrow.down"
        size={size - 4}
        tintColor={theme.colors.text}
      />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9999,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
});
