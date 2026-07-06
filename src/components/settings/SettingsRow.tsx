import type { StyleProp, ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type SettingsRowProps = {
  title: string;
  subtitle?: string;
  onPress?: () => void;
  showChevron?: boolean;
  selected?: boolean;
  accessoryOnPress?: () => void;
  destructive?: boolean;
  icon?: React.ComponentProps<typeof SymbolView>['name'];
  rightElement?: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  disabled?: boolean;
  testID?: string;
};

export function SettingsRow({
  title,
  subtitle,
  onPress,
  showChevron = false,
  selected = false,
  accessoryOnPress,
  destructive = false,
  icon,
  rightElement,
  style,
  disabled = false,
  testID,
}: SettingsRowProps) {
  const theme = useTheme();

  const titleColor = destructive
    ? theme.colors.error
    : theme.colors.text;

  const content = (
    <Box
      flexDirection="row"
      alignItems="center"
      minHeight={44}
      paddingHorizontal="md"
      paddingVertical="sm"
      gap="md"
      opacity={disabled ? 0.45 : 1}
      style={style}
    >
      {icon ? (
        <SymbolView
          name={icon}
          size={22}
          tintColor={theme.colors.text}
          style={{ width: 28 }}
        />
      ) : null}
      <Box flex={1} gap="xs">
        <ThemedText variant="body" color={titleColor} numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </Box>
      {rightElement}
      {selected ? (
        <SymbolView
          name="checkmark"
          size={16}
          weight="semibold"
          tintColor={theme.colors.text}
        />
      ) : null}
      {accessoryOnPress ? (
        <PressableBox
          onPress={accessoryOnPress}
          disabled={disabled}
          hitSlop={8}
          marginLeft="xs"
          paddingLeft="sm"
          paddingVertical="xs"
          style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
        >
          <SymbolView
            name="chevron.right"
            size={14}
            weight="semibold"
            tintColor={theme.colors.textMuted}
          />
        </PressableBox>
      ) : showChevron ? (
        <SymbolView
          name="chevron.right"
          size={14}
          weight="semibold"
          tintColor={theme.colors.textMuted}
        />
      ) : null}
    </Box>
  );

  if (!onPress) {
    return content;
  }

  return (
    <PressableBox
      onPress={onPress}
      disabled={disabled}
      testID={testID}
      accessibilityRole="button"
      style={({ pressed }) => ({ opacity: pressed ? 0.65 : 1 })}
    >
      {content}
    </PressableBox>
  );
}
