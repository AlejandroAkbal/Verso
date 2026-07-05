import { StatusBar } from 'expo-status-bar';
import { createContext, useContext, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { theme, type Theme } from './theme';

const ThemeContext = createContext<Theme>(theme);

export function VersoThemeProvider({ children }: { children: ReactNode }) {
  return (
    <ThemeContext.Provider value={theme}>
      <View style={styles.root}>
        <StatusBar style="light" />
        {children}
      </View>
    </ThemeContext.Provider>
  );
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
