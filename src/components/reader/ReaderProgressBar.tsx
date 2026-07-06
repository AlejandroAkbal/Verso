import { useEffect, useState } from 'react';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RawBox } from '@/components/ui';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

const CHROME_FADE_MS = 220;

type ReaderProgressBarProps = {
  progression: number;
  visible: boolean;
};

export function ReaderProgressBar({ progression, visible }: ReaderProgressBarProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { animated } = useSmoothProgress(progression);
  const chromeOpacity = useSharedValue(visible ? 1 : 0);
  const [trackWidth, setTrackWidth] = useState(0);

  useEffect(() => {
    chromeOpacity.value = withTiming(visible ? 1 : 0, { duration: CHROME_FADE_MS });
  }, [chromeOpacity, visible]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: chromeOpacity.value,
    transform: [{ translateY: (1 - chromeOpacity.value) * 12 }],
  }));

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * animated.value,
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          paddingBottom: insets.bottom + 8,
          paddingHorizontal: 20,
        },
        containerStyle,
      ]}
    >
      <RawBox
        height={3}
        borderRadius="full"
        backgroundColor="progressTrack"
        overflow="hidden"
        onLayout={(event) => {
          setTrackWidth(event.nativeEvent.layout.width);
        }}
      >
        <Animated.View
          style={[
            {
              height: '100%',
              borderRadius: 999,
              backgroundColor: theme.colors.progress,
            },
            fillStyle,
          ]}
        />
      </RawBox>
    </Animated.View>
  );
}
