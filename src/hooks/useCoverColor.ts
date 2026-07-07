import { useMemo } from 'react';

import { useDominantColor } from '@/hooks/useDominantColor';

export type CoverColors = {
  /** Saturated tint for shadow/edge glow. */
  glow: string;
  /** Darker, desaturated wash that blends into the near-black background. */
  ambient: string;
};

/** Deterministic hue (0-359) from any string. Mirrors useDominantColor's hash. */
function hueFromString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = input.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash) % 360;
}

/** Saturation kept under 80% per the taste guardrail (no neon glow). */
function colorsFromHue(hue: number): CoverColors {
  return {
    glow: `hsl(${hue}, 55%, 45%)`,
    ambient: `hsl(${hue}, 40%, 22%)`,
  };
}

/** Sync color for grid cells — derived from the stored blurhash, no async work. */
export function coverColorFromBlurhash(blurhash?: string): CoverColors {
  return colorsFromHue(hueFromString(blurhash ?? ''));
}

/** Truer color for single-book surfaces (reader, ambient backdrop). */
export function useCoverColor(imageUrl?: string, blurhash?: string): CoverColors {
  const colors = useDominantColor(imageUrl, blurhash);
  return useMemo(
    () => ({ glow: colors.dominant, ambient: colors.background }),
    [colors.dominant, colors.background],
  );
}
