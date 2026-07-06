import { useState } from 'react';
import type { SharedValue } from 'react-native-reanimated';
import { runOnJS, useAnimatedReaction } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

type DownloadingPercentTextProps = {
  progress?: number;
  animatedProgress?: SharedValue<number>;
  label: (percent: number) => string;
};

export function DownloadingPercentText({
  progress = 0,
  animatedProgress,
  label,
}: DownloadingPercentTextProps) {
  const theme = useTheme();
  const internal = useSmoothProgress(progress);
  const source = animatedProgress ?? internal.animated;
  const [percent, setPercent] = useState(() => Math.round(progress * 100));

  useAnimatedReaction(
    () => Math.round(source.value * 100),
    (next, previous) => {
      if (next !== previous) {
        runOnJS(setPercent)(next);
      }
    },
  );

  return (
    <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
      {label(percent)}
    </ThemedText>
  );
}
