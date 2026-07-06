import type { TextInputProps } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { Box, InputBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type SearchFieldProps = TextInputProps & {
  value: string;
  onChangeText: (text: string) => void;
};

export function SearchField({ value, onChangeText, placeholder, ...props }: SearchFieldProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      gap="sm"
      borderRadius="lg"
      borderWidth={0.5}
      borderColor="border"
      paddingHorizontal="md"
      minHeight={44}
      backgroundColor="surfaceElevated"
    >
      <SymbolView name="magnifyingglass" size={16} tintColor={theme.colors.textMuted} />
      <InputBox
        flex={1}
        paddingVertical="sm"
        style={{ color: theme.colors.text, fontSize: 16 }}
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
    </Box>
  );
}
