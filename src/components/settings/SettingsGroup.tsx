import { Children, Fragment, type ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
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
    <View style={styles.section}>
      {header ? (
        <ThemedText variant="label" color={theme.colors.textMuted} style={styles.header}>
          {header}
        </ThemedText>
      ) : null}
      <View style={[styles.group, { backgroundColor: theme.colors.groupedBackground }]}>
        {items.map((child, index) => (
          <Fragment key={index}>
            {child}
            {index < items.length - 1 ? (
              <View style={[styles.separator, { backgroundColor: theme.colors.separator }]} />
            ) : null}
          </Fragment>
        ))}
      </View>
      {footer ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.footer}>
          {footer}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
  },
  header: {
    marginBottom: 8,
    marginLeft: 16,
    textTransform: 'uppercase',
  },
  group: {
    borderRadius: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
  footer: {
    marginTop: 8,
    marginHorizontal: 16,
    lineHeight: 18,
  },
});
