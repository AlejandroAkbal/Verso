import { BlurView } from 'expo-blur';
import type { ViewStyle } from 'react-native';

import { Box, ImageBox } from '@/components/ui';
import { useReduceTransparency } from '@/hooks/useReduceTransparency';

type CoverAmbianceProps = {
  /** Ambient tint color (e.g. CoverColors.ambient). */
  color: string;
  /** Optional cover image to blur behind the tint for organic depth. */
  imageUrl?: string;
  imageHeaders?: Record<string, string>;
  /** Blur strength when transparency is allowed. Default 60. */
  intensity?: number;
  style?: ViewStyle;
};

/**
 * Absolute-fill ambient background layer. With an image, renders a heavily
 * blurred cover tinted by `color` (Infuse-style depth). Without one, a flat
 * `color` wash. Under Reduce Transparency, drops the blur for a solid tint.
 */
export function CoverAmbiance({
  color,
  imageUrl,
  imageHeaders,
  intensity = 60,
  style,
}: CoverAmbianceProps) {
  const reduceTransparency = useReduceTransparency();
  const fill = { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 } as const;

  if (reduceTransparency || !imageUrl) {
    return (
      <Box
        pointerEvents="none"
        style={[fill, { backgroundColor: color, opacity: 0.18 }, style]}
      />
    );
  }

  return (
    <Box pointerEvents="none" style={[fill, style]}>
      <ImageBox
        source={{ uri: imageUrl, headers: imageHeaders }}
        style={fill}
        contentFit="cover"
        blurRadius={40}
      />
      <Box style={[fill, { backgroundColor: color, opacity: 0.5 }]} />
      <BlurView intensity={intensity} tint="dark" style={fill} />
    </Box>
  );
}
