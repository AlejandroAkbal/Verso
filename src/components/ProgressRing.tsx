import Svg, { Circle } from 'react-native-svg';

import { Box } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type ProgressRingProps = {
  progress: number;
  size?: number;
  strokeWidth?: number;
};

export function ProgressRing({
  progress,
  size = 28,
  strokeWidth = 2.5,
}: ProgressRingProps) {
  const theme = useTheme();
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.min(Math.max(progress, 0), 1);
  const strokeDashoffset = circumference * (1 - clamped);

  return (
    <Box alignItems="center" justifyContent="center" width={size} height={size}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.accentMuted}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.text}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
    </Box>
  );
}
