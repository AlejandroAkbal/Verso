import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme/ThemeProvider';

type SettingsFieldRowProps = TextInputProps & {
  label: string;
};

export function SettingsFieldRow({ label, style, ...props }: SettingsFieldRowProps) {
  const theme = useTheme();

  return (
    <View style={styles.row}>
      {label ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        style={[styles.input, { color: theme.colors.text }, style]}
        placeholderTextColor={theme.colors.textMuted}
        keyboardAppearance="dark"
        selectionColor={theme.colors.text}
        {...props}
      />
    </View>
  );
}

type SettingsMultilineFieldProps = TextInputProps & {
  label: string;
};

export function SettingsMultilineField({ label, style, ...props }: SettingsMultilineFieldProps) {
  const theme = useTheme();

  return (
    <View style={styles.multilineRow}>
      {label ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.label}>
          {label}
        </ThemedText>
      ) : null}
      <TextInput
        style={[styles.multilineInput, { color: theme.colors.text }, style]}
        placeholderTextColor={theme.colors.textMuted}
        keyboardAppearance="dark"
        selectionColor={theme.colors.text}
        multiline
        scrollEnabled
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  label: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  input: {
    fontSize: 17,
    lineHeight: 22,
    minHeight: 40,
    paddingVertical: 6,
    width: '100%',
  },
  multilineRow: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  multilineInput: {
    fontSize: 17,
    lineHeight: 22,
    minHeight: 88,
    maxHeight: 160,
    paddingVertical: 6,
    width: '100%',
    textAlignVertical: 'top',
  },
});
