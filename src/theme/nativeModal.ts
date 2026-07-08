type ModalHeaderTheme = { colors: { surface: string; text: string } };

export function nativeModalHeaderOptions(theme: ModalHeaderTheme) {
  return {
    headerTransparent: false,
    headerStyle: { backgroundColor: theme.colors.surface },
    headerTintColor: theme.colors.text,
    headerShadowVisible: false,
  };
}
