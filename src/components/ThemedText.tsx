import { StyleSheet, Text, type TextProps, type TextStyle } from 'react-native';

import { useTheme } from '@/theme/ThemeProvider';

type Variant = 'title' | 'subtitle' | 'body' | 'caption' | 'label';

type ThemedTextProps = TextProps & {
  variant?: Variant;
  color?: string;
};

const variantStyles: Record<Variant, TextStyle> = {
  title: { fontSize: 22, fontWeight: '700', lineHeight: 28 },
  subtitle: { fontSize: 17, fontWeight: '600', lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400', lineHeight: 22 },
  caption: { fontSize: 13, fontWeight: '400', lineHeight: 18 },
  label: { fontSize: 11, fontWeight: '600', lineHeight: 14, letterSpacing: 0.5, textTransform: 'uppercase' },
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
      style={[
        { color: color ?? theme.colors.text },
        variantStyles[variant],
        style,
      ]}
      {...props}
    />
  );
}
