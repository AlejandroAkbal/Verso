import { StyleSheet } from 'react-native';

import type { Theme } from '@/theme/theme';

/** Base book-cover frame: rounded corners + hairline border. */
export function coverFrameStyle(theme: Theme) {
  return {
    borderRadius: theme.cover.borderRadius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: theme.colors.coverBorder,
  };
}

/** Elevated drop shadow for the hero cover on the detail screen. */
export const coverShadowStyle = {
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 14 },
  shadowOpacity: 0.5,
  shadowRadius: 20,
  elevation: 14,
} as const;
