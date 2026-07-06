import { createBox, createText } from '@shopify/restyle';
import { Image } from 'expo-image';
import type { ComponentProps } from 'react';
import { Pressable, ScrollView, TextInput, View } from 'react-native';

import type { Theme } from '@/theme/theme';

export const Box = createBox<Theme>();
export const PressableBox = createBox<Theme, ComponentProps<typeof Pressable>>(
  Pressable,
);
export const ScrollBox = createBox<Theme, ComponentProps<typeof ScrollView>>(
  ScrollView,
);
export const ImageBox = createBox<Theme, ComponentProps<typeof Image>>(Image);
export const InputBox = createBox<Theme, ComponentProps<typeof TextInput>>(
  TextInput,
);
export const RawBox = createBox<Theme, ComponentProps<typeof View>>(View);
export const Text = createText<Theme>();
