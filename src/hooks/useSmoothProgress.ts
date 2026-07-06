import { useEffect } from 'react';
import {
  Easing,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PROGRESS_ANIMATION_MS = 420;

export function useSmoothProgress(target: number) {
  const clamped = Math.min(1, Math.max(0, target));
  const animated = useSharedValue(clamped);

  useEffect(() => {
    animated.value = withTiming(clamped, {
      duration: PROGRESS_ANIMATION_MS,
      easing: Easing.out(Easing.cubic),
    });
  }, [animated, clamped]);

  const displayPercent = useDerivedValue(() => {
    return Math.round(animated.value * 100);
  });

  return { animated, displayPercent };
}
