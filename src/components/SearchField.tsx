import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { useTheme } from '@/theme/ThemeProvider';

type SearchFieldProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchField({ value, onChangeText, placeholder, ...props }: SearchFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceElevated, borderColor: theme.colors.border },
      ]}
    >
      <SymbolView name="magnifyingglass" size={16} tintColor={theme.colors.textMuted} />
      <TextInput
        style={[styles.input, { color: theme.colors.text }]}
        placeholder={placeholder ?? t('common.search')}
        placeholderTextColor={theme.colors.textMuted}
        value={value}
        onChangeText={onChangeText}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        clearButtonMode="while-editing"
        keyboardAppearance="dark"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    minHeight: 44,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 10,
  },
});
