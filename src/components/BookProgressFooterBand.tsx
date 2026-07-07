import { useState } from 'react';
import { SymbolView } from 'expo-symbols';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { RawBox } from '@/components/ui';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

const OVERLAY_HEIGHT = 22;

type BookProgressFooterBandProps = {
  percent: number;
};

/** Translucent overlay pinned to the bottom-inside of the cover image. */
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: OVERLAY_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 6,
        backgroundColor: 'rgba(0,0,0,0.58)',
      }}
    >
      <RawBox
        style={{
          flex: 1,
          height: 2.5,
          borderRadius: 999,
          overflow: 'hidden',
          backgroundColor: 'rgba(255,255,255,0.22)',
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
      <RawBox style={{ minWidth: 26, alignItems: 'flex-end' }}>
        <Animated.Text
          style={{
            color: 'rgba(255,255,255,0.72)',
            fontSize: 9,
            fontWeight: '600',
            lineHeight: 12,
          }}
        >
          {`${Math.round(clamped)}%`}
        </Animated.Text>
      </RawBox>
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
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: OVERLAY_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.58)',
      }}
    >
      <SymbolView
        name="checkmark"
        size={11}
        tintColor={theme.colors.success}
        weight="semibold"
      />
    </RawBox>
  );
}

/** @deprecated No longer used — overlay is inside the cover Box */
export const BOOK_PROGRESS_FOOTER_HEIGHT = 0;
