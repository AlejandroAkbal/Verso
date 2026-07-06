import { createTheme } from '@shopify/restyle';

const rawTheme = {
  colors: {
    background: '#000000',
    surface: '#0A0A0A',
    surfaceElevated: '#1C1C1E',
    groupedBackground: '#1C1C1E',
    separator: '#38383A',
    border: '#2C2C2E',
    text: '#FFFFFF',
    textSecondary: '#A3A3A3',
    textMuted: '#636366',
    /** Primary filled buttons (Read, Download). */
    primary: '#FFFFFF',
    onPrimary: '#000000',
    /** Secondary pill / chip surfaces. */
    secondary: '#1C1C1E',
    /** Tappable list rows and inline actions — white, not system blue. */
    interactive: '#FFFFFF',
    /** @deprecated Use `interactive` — kept for gradual migration. */
    link: '#FFFFFF',
    accent: '#FFFFFF',
    accentMuted: '#3A3A3C',
    error: '#FF453A',
    /** Reserved for rare status only — not used on book covers. */
    success: '#30D158',
    warning: '#FF9F0A',
    overlay: 'rgba(0, 0, 0, 0.55)',
    blurTint: 'dark' as const,
    /** Reading progress on covers. */
    progress: '#FFFFFF',
    progressTrack: 'rgba(255, 255, 255, 0.2)',
  },
  opacity: {
    dimmed: 0.35,
    finished: 0.42,
  },
  spacing: {
    none: 0,
    xxs: 2,
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
    0: 0,
    2: 2,
    4: 4,
    6: 6,
    8: 8,
    10: 10,
    12: 12,
    14: 14,
    16: 16,
    18: 18,
    20: 20,
    24: 24,
    28: 28,
    32: 32,
    40: 40,
    48: 48,
  },
  radii: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  borderRadii: {
    sm: 6,
    md: 10,
    lg: 12,
    xl: 16,
    full: 9999,
  },
  textVariants: {
    title: {
      color: 'text',
      fontSize: 22,
      fontWeight: '700',
      lineHeight: 28,
    },
    subtitle: {
      color: 'text',
      fontSize: 17,
      fontWeight: '600',
      lineHeight: 24,
    },
    body: {
      color: 'text',
      fontSize: 15,
      fontWeight: '400',
      lineHeight: 22,
    },
    caption: {
      color: 'text',
      fontSize: 13,
      fontWeight: '400',
      lineHeight: 18,
    },
    label: {
      color: 'text',
      fontSize: 11,
      fontWeight: '600',
      lineHeight: 14,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
    },
    defaults: {
      color: 'text',
      flexShrink: 1,
    },
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

export const theme = createTheme(rawTheme);

export type Theme = typeof theme;
