import type { TextProps } from 'react-native';

import { Text } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

type ThemedTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

export function ThemedText({
  variant = 'body',
  color,
  style,
  ...props
}: ThemedTextProps) {
  const theme = useTheme();

  return (
    <Text
      variant={variant}
      style={[
        {
          color: color ?? theme.colors.text,
          flexShrink: 1,
        },
        style,
      ]}
      {...props}
    />
  );
}
