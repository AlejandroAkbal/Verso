import { Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { SymbolView } from 'expo-symbols';

import { ThemedText } from '@/components/ThemedText';
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
}: SettingsRowProps) {
  const theme = useTheme();

  const titleColor = destructive
    ? theme.colors.error
    : theme.colors.text;

  const content = (
    <View style={[styles.row, style, disabled && styles.disabled]}>
      {icon ? (
        <SymbolView name={icon} size={22} tintColor={theme.colors.text} style={styles.icon} />
      ) : null}
      <View style={styles.textBlock}>
        <ThemedText variant="body" color={titleColor} numberOfLines={2}>
          {title}
        </ThemedText>
        {subtitle ? (
          <ThemedText variant="caption" color={theme.colors.textMuted} numberOfLines={2}>
            {subtitle}
          </ThemedText>
        ) : null}
      </View>
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
        <Pressable
          onPress={accessoryOnPress}
          disabled={disabled}
          hitSlop={8}
          style={({ pressed }) => [styles.accessory, pressed && styles.pressed]}
        >
          <SymbolView
            name="chevron.right"
            size={14}
            weight="semibold"
            tintColor={theme.colors.textMuted}
          />
        </Pressable>
      ) : showChevron ? (
        <SymbolView
          name="chevron.right"
          size={14}
          weight="semibold"
          tintColor={theme.colors.textMuted}
        />
      ) : null}
    </View>
  );

  if (!onPress) {
    return content;
  }

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 44,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 12,
  },
  icon: {
    width: 28,
  },
  textBlock: {
    flex: 1,
    gap: 2,
  },
  pressed: {
    opacity: 0.65,
  },
  disabled: {
    opacity: 0.45,
  },
  accessory: {
    marginLeft: 4,
    paddingLeft: 8,
    paddingVertical: 4,
  },
});
