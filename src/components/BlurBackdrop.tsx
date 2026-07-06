import { BlurView } from 'expo-blur';
import type { ReactNode } from 'react';

import { Box, ImageBox } from '@/components/ui';

type BlurBackdropProps = {
  imageUrl: string;
  imageHeaders?: Record<string, string>;
  dominantColor: string;
  children: ReactNode;
};

export function BlurBackdrop({
  imageUrl,
  imageHeaders,
  dominantColor,
  children,
}: BlurBackdropProps) {
  return (
    <Box flex={1} backgroundColor="background">
      <ImageBox
        source={{
          uri: imageUrl,
          headers: imageHeaders,
        }}
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        contentFit="cover"
        blurRadius={40}
      />
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        opacity={0.55}
        style={{ backgroundColor: dominantColor }}
      />
      <BlurView
        intensity={60}
        tint="dark"
        style={{ position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 }}
      />
      <Box flex={1}>{children}</Box>
    </Box>
  );
}
