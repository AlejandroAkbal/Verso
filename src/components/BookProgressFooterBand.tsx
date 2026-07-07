import { SymbolView } from 'expo-symbols';

import { RawBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { ThemedText } from '@/components/ThemedText';

type BookProgressFooterBandProps = {
  percent: number;
};

/**
 * Text-only progress indicator — sits below the jacket image.
 * Minimal footnote style.
 */
export function BookProgressFooterBand({ percent }: BookProgressFooterBandProps) {
  const theme = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <RawBox
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 2,
        marginTop: 5,
      }}
    >
      <ThemedText
        style={{
          color: theme.colors.textMuted,
          fontSize: 9,
          fontWeight: '500',
          lineHeight: 12,
        }}
      >
        {`${Math.round(clamped)}%`}
      </ThemedText>
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
