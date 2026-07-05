import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type CoverProgressBarProps = {
  percent: number;
};

export function CoverProgressBar({ percent }: CoverProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <View style={[styles.track, { backgroundColor: theme.colors.progressTrack }]}>
      <View
        style={[
          styles.fill,
          {
            width: `${clamped}%`,
            backgroundColor: theme.colors.progress,
          },
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 2,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
  },
});
