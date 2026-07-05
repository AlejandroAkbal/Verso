import { useEffect, useState } from 'react';
import ImageColors from 'react-native-image-colors';

import { theme } from '@/theme/theme';

type ColorResult = {
  dominant: string;
  background: string;
  detail: string;
};

const FALLBACK: ColorResult = {
  dominant: theme.colors.surfaceElevated,
  background: theme.colors.surface,
  detail: theme.colors.textSecondary,
};

function hashToColor(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 45%, 25%)`;
}

export function useDominantColor(imageUrl: string | undefined, blurhash?: string) {
  const [colors, setColors] = useState<ColorResult>(FALLBACK);

  useEffect(() => {
    if (!imageUrl) {
      setColors({
        ...FALLBACK,
        dominant: blurhash ? hashToColor(blurhash) : FALLBACK.dominant,
        background: blurhash ? hashToColor(blurhash + 'bg') : FALLBACK.background,
      });
      return;
    }

    let cancelled = false;

    async function extract() {
      try {
        const result = await ImageColors.getColors(imageUrl!, {
          fallback: hashToColor(imageUrl!),
          cache: true,
          key: imageUrl!,
        });

        if (cancelled) return;

        if (result.platform === 'ios') {
          setColors({
            dominant: result.primary,
            background: result.background,
            detail: result.detail,
          });
        } else if (result.platform === 'android') {
          setColors({
            dominant: result.dominant,
            background: result.average,
            detail: result.vibrant,
          });
        } else {
          setColors({
            dominant: result.dominant,
            background: result.dominant,
            detail: result.vibrant,
          });
        }
      } catch {
        if (!cancelled) {
          setColors({
            ...FALLBACK,
            dominant: hashToColor(imageUrl!),
            background: hashToColor(imageUrl! + 'bg'),
          });
        }
      }
    }

    void extract();

    return () => {
      cancelled = true;
    };
  }, [imageUrl, blurhash]);

  return colors;
}
