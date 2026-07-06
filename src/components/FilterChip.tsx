import type { StyleProp, ViewStyle } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { PressableBox } from '@/components/ui';
import { selectionHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

type FilterChipProps = {
  label: string;
  selected: boolean;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
};

export function FilterChip({ label, selected, onPress, style }: FilterChipProps) {
  const theme = useTheme();

  return (
    <PressableBox
      onPress={() => {
        void selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [
        {
          alignSelf: 'flex-start',
          flexShrink: 0,
          paddingHorizontal: 14,
          paddingVertical: 8,
          borderRadius: 999,
          borderWidth: 0.5,
          overflow: 'hidden',
          backgroundColor: selected ? theme.colors.secondary : 'transparent',
          borderColor: theme.colors.border,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <ThemedText
        variant="caption"
        color={selected ? theme.colors.text : theme.colors.textSecondary}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </PressableBox>
  );
}
