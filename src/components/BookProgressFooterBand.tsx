import { useState } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';
import { RawBox } from '@/components/ui';
import { useSmoothProgress } from '@/hooks/useSmoothProgress';
import { useTheme } from '@/theme/ThemeProvider';

const FOOTER_HEIGHT = 26;

type BookProgressFooterBandProps = {
  percent: number;
  label: string;
};

/** Attached footer under the jacket — solid band, bar + caption, zero gap from cover. */
export function BookProgressFooterBand({ percent, label }: BookProgressFooterBandProps) {
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
        height: FOOTER_HEIGHT,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 8,
        backgroundColor: theme.colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.coverBorder,
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
      <ThemedText
        variant="caption"
        color={theme.colors.textMuted}
        style={{ fontSize: 11, lineHeight: 14, minWidth: 30, textAlign: 'right' }}
      >
        {label}
      </ThemedText>
    </RawBox>
  );
}

type BookFinishedFooterBandProps = {
  label: string;
};

export function BookFinishedFooterBand({ label }: BookFinishedFooterBandProps) {
  const theme = useTheme();

  return (
    <RawBox
      style={{
        height: FOOTER_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: theme.colors.surface,
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: theme.colors.coverBorder,
      }}
    >
      <ThemedText
        variant="caption"
        color={theme.colors.textMuted}
        style={{ fontSize: 11, lineHeight: 14 }}
      >
        {label}
      </ThemedText>
    </RawBox>
  );
}

export const BOOK_PROGRESS_FOOTER_HEIGHT = FOOTER_HEIGHT;
