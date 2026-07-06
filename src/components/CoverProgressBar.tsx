import { Box } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type CoverProgressBarProps = {
  percent: number;
};

export function CoverProgressBar({ percent }: CoverProgressBarProps) {
  const theme = useTheme();
  const clamped = Math.min(Math.max(percent, 0), 100);

  return (
    <Box
      position="absolute"
      left={0}
      right={0}
      bottom={0}
      height={2}
      overflow="hidden"
      style={{ backgroundColor: theme.colors.progressTrack }}
    >
      <Box
        height="100%"
        width={`${clamped}%`}
        backgroundColor="progress"
      />
    </Box>
  );
}
