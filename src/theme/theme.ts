export const theme = {
  colors: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceElevated: '#141414',
    border: '#1F1F1F',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#737373',
    accent: '#FFFFFF',
    accentMuted: '#404040',
    error: '#EF4444',
    success: '#22C55E',
    warning: '#F59E0B',
    overlay: 'rgba(0, 0, 0, 0.6)',
    blurTint: 'dark' as const,
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 16,
    xl: 24,
    full: 9999,
  },
  typography: {
    fontFamily: {
      regular: 'System',
      medium: 'System',
      bold: 'System',
    },
    sizes: {
      xs: 11,
      sm: 13,
      md: 15,
      lg: 17,
      xl: 22,
      xxl: 28,
      display: 34,
    },
    lineHeights: {
      tight: 1.2,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  cover: {
    aspectRatio: 2 / 3,
    borderRadius: 8,
  },
  grid: {
    numColumns: 3,
    gap: 12,
    horizontalPadding: 16,
  },
  reader: {
    fontSizeMin: 14,
    fontSizeMax: 28,
    fontSizeDefault: 18,
    lineHeightMultiplier: 1.6,
    paddingHorizontal: 24,
    paddingVertical: 48,
  },
  animation: {
    fast: 150,
    normal: 250,
    slow: 400,
  },
} as const;

export type Theme = typeof theme;
