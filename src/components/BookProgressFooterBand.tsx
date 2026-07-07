import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { RawBox } from '@/components/ui';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

type BookProgressFooterBandProps = {
  percent: number;
};

/**
 * Below-cover progress bar — sits outside the jacket image, Apple Books style.
 * Thin track + animated fill + small percentage label.
 */
export function BookProgressFooterBand({ percent }: BookProgressFooterBandProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const { animated } = useSmoothProgress(clamped / 100);
  const [trackWidth, setTrackWidth] = useState(0);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth * animated.value,
  }));

  return (
    <RawBox
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 2,
        marginTop: 5,
      }}
    >
      <RawBox
        style={{
          flex: 1,
          height: 2,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: theme.colors.progressTrack,
        }}
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
      <Animated.Text
        style={{
          color: theme.colors.textMuted,
          fontSize: 9,
          fontWeight: '500',
          lineHeight: 12,
          minWidth: 22,
          textAlign: 'right',
        }}
      >
        {`${Math.round(clamped)}%`}
      </Animated.Text>
    </RawBox>
  );
}

type BookFinishedFooterBandProps = {
  label: string;
};

export function BookFinishedFooterBand({ label: _label }: BookFinishedFooterBandProps) {
  const theme = useTheme();

  return (
    <RawBox
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 5,
        height: 14,
      }}
    >
      <SymbolView
        name="checkmark.circle.fill"
        size={12}
        tintColor={theme.colors.textMuted}
      />
    </RawBox>
  );
}

export const BOOK_PROGRESS_FOOTER_HEIGHT = 0;
