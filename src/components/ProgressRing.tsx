import type { SharedValue } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useAnimatedProps } from 'react-native-reanimated';

import { Box } from '@/components/ui';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

type ProgressRingProps = {
  progress?: number;
  animatedProgress?: SharedValue<number>;
  size?: number;
  strokeWidth?: number;
};

export function ProgressRing({
  progress = 0,
  animatedProgress,
  size = 28,
  strokeWidth = 2.5,
}: ProgressRingProps) {
  const theme = useTheme();
  const internal = useSmoothProgress(progress);
  const source = animatedProgress ?? internal.animated;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const animatedProps = useAnimatedProps(() => {
    const clamped = Math.min(1, Math.max(0, source.value));
    return {
      strokeDashoffset: circumference * (1 - clamped),
    };
  });

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
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={theme.colors.text}
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
          animatedProps={animatedProps}
        />
      </Svg>
    </Box>
  );
}
