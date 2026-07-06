import { Children, Fragment, type ReactNode } from 'react';

import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type SettingsGroupProps = {
  children: ReactNode;
  header?: string;
  footer?: string;
};

export function SettingsGroup({ children, header, footer }: SettingsGroupProps) {
  const theme = useTheme();
  const items = Children.toArray(children).filter(Boolean);

  return (
    <Box marginBottom="lg">
      {header ? (
        <ThemedText
          variant="label"
          color={theme.colors.textMuted}
          style={{ marginBottom: 8, marginLeft: 16, textTransform: 'uppercase' }}
        >
          {header}
        </ThemedText>
      ) : null}
      <Box borderRadius="lg" backgroundColor="groupedBackground">
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 ? (
              <Box height={0.5} marginLeft="md" backgroundColor="separator" />
            ) : null}
          </Fragment>
        ))}
      </Box>
      {footer ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textMuted}
          style={{ marginTop: 8, marginHorizontal: 16, lineHeight: 18 }}
        >
          {footer}
        </ThemedText>
      ) : null}
    </Box>
  );
}
