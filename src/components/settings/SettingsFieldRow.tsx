import type { TextInputProps } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { Box, InputBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type SettingsFieldRowProps = TextInputProps & {
  label: string;
};

export function SettingsFieldRow({ label, style, ...props }: SettingsFieldRowProps) {
  const theme = useTheme();

  return (
    <Box paddingHorizontal="md" paddingVertical="md" gap="sm">
      {label ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textMuted}
          style={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          {label}
        </ThemedText>
      ) : null}
      <InputBox
        minHeight={40}
        width="100%"
        paddingVertical="xs"
        style={[{ color: theme.colors.text, fontSize: 17, lineHeight: 22 }, style]}
        placeholderTextColor={theme.colors.textMuted}
        keyboardAppearance="dark"
        selectionColor={theme.colors.text}
        {...props}
      />
    </Box>
  );
}

type SettingsMultilineFieldProps = TextInputProps & {
  label: string;
};

export function SettingsMultilineField({ label, style, ...props }: SettingsMultilineFieldProps) {
  const theme = useTheme();

  return (
    <Box paddingHorizontal="md" paddingVertical="md" gap="sm">
      {label ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textMuted}
          style={{ letterSpacing: 0.4, textTransform: 'uppercase' }}
        >
          {label}
        </ThemedText>
      ) : null}
      <InputBox
        minHeight={88}
        maxHeight={160}
        width="100%"
        paddingVertical="xs"
        style={[
          {
            color: theme.colors.text,
            fontSize: 17,
            lineHeight: 22,
            textAlignVertical: 'top',
          },
          style,
        ]}
        placeholderTextColor={theme.colors.textMuted}
        keyboardAppearance="dark"
        selectionColor={theme.colors.text}
        multiline
        scrollEnabled
        {...props}
      />
    </Box>
  );
}
