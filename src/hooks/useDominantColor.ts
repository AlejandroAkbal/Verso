import { useEffect, useMemo, useState } from 'react';
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

function fallbackFromBlurhash(blurhash?: string): ColorResult {
  if (!blurhash) {
    return FALLBACK;
  }

  return {
    ...FALLBACK,
    dominant: hashToColor(blurhash),
    background: hashToColor(`${blurhash}bg`),
  };
}

export function useDominantColor(imageUrl: string | undefined, blurhash?: string) {
  const placeholder = useMemo(() => fallbackFromBlurhash(blurhash), [blurhash]);
  const [extracted, setExtracted] = useState<{ url: string; colors: ColorResult } | null>(
    null,
  );

  useEffect(() => {
    if (!imageUrl) {
      return;
    }

    const url = imageUrl;
    let cancelled = false;

    async function extract() {
      try {
        const result = await ImageColors.getColors(url, {
          fallback: hashToColor(url),
          cache: true,
          key: url,
        });

        if (cancelled) return;

        if (result.platform === 'ios') {
          setExtracted({
            url,
            colors: {
              dominant: result.primary,
              background: result.background,
              detail: result.detail,
            },
          });
        } else if (result.platform === 'android') {
          setExtracted({
            url,
            colors: {
              dominant: result.dominant,
              background: result.average,
              detail: result.vibrant,
            },
          });
        } else {
          setExtracted({
            url,
            colors: {
              dominant: result.dominant,
              background: result.dominant,
              detail: result.vibrant,
            },
          });
        }
      } catch {
        if (!cancelled) {
          setExtracted({
            url,
            colors: {
              ...FALLBACK,
              dominant: hashToColor(url),
              background: hashToColor(`${url}bg`),
            },
          });
        }
      }
    }

    queueMicrotask(() => {
      void extract();
    });

    return () => {
      cancelled = true;
    };
  }, [imageUrl]);

  if (!imageUrl) {
    return placeholder;
  }

  if (extracted?.url === imageUrl) {
    return extracted.colors;
  }

  return placeholder;
}
