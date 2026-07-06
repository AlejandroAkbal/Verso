import { StatusBar } from 'expo-status-bar';
import { ThemeProvider, useTheme as useRestyleTheme } from '@shopify/restyle';
import type { ReactNode } from 'react';

import { Box } from '@/components/ui';
import { theme, type Theme } from './theme';

export function AppThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <Box flex={1} backgroundColor="background">
        <StatusBar style="light" />
        {children}
      </Box>
    </ThemeProvider>
  );
}

export function useTheme(): Theme {
  return useRestyleTheme<Theme>();
}
