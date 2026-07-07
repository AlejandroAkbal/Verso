import { Platform } from 'react-native';

type ModalHeaderTheme = { colors: { background: string; text: string } };

/**
 * Shared header options for native modal route screens (`presentation: 'modal'`).
 * iOS gets a translucent dark-blur header floating over content; Android gets a
 * solid header. Keep every modal route consistent by spreading this into its
 * `options` / `screenOptions` — per-screen `title` and `headerRight` ("Done")
 * stay on the screen itself.
 */
export function nativeModalHeaderOptions(theme: ModalHeaderTheme) {
  return {
    headerTransparent: Platform.OS === 'ios',
    headerBlurEffect: 'dark' as const,
    headerStyle: Platform.select({
      ios: { backgroundColor: 'transparent' },
      android: { backgroundColor: theme.colors.background },
    }),
    headerTintColor: theme.colors.text,
    headerShadowVisible: false,
  };
}
