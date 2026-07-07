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
          height: 34,
          paddingHorizontal: 14,
          borderRadius: 999,
          overflow: 'hidden',
          justifyContent: 'center',
          backgroundColor: selected ? theme.colors.accentMuted : theme.colors.surfaceElevated,
          opacity: pressed ? 0.75 : 1,
        },
        style,
      ]}
    >
      <ThemedText
        variant="caption"
        style={{ fontWeight: selected ? '600' : '400' }}
        color={selected ? theme.colors.text : theme.colors.textSecondary}
        numberOfLines={1}
      >
        {label}
      </ThemedText>
    </PressableBox>
  );
}
