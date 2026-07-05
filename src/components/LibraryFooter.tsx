import { StyleSheet, View } from 'react-native';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { useTheme } from '@/theme/ThemeProvider';

type LibraryFooterProps = {
  visibleCount: number;
  totalCount: number;
  downloadedCount: number;
  inProgressCount: number;
  finishedCount: number;
  serverTitle: string;
  isFiltered: boolean;
};

export function LibraryFooter({
  visibleCount,
  totalCount,
  downloadedCount,
  inProgressCount,
  finishedCount,
  serverTitle,
  isFiltered,
}: LibraryFooterProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const primaryLine = isFiltered
    ? t('library.footer.filtered', { visible: visibleCount, total: totalCount })
    : t('library.footer.books', { count: totalCount });

  const statParts: string[] = [];
  if (downloadedCount > 0) {
    statParts.push(t('library.footer.downloaded', { count: downloadedCount }));
  }
  if (inProgressCount > 0) {
    statParts.push(t('library.footer.inProgress', { count: inProgressCount }));
  }
  if (finishedCount > 0) {
    statParts.push(t('library.footer.finished', { count: finishedCount }));
  }

  return (
    <View style={[styles.container, { borderTopColor: theme.colors.border }]}>
      <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
        {primaryLine}
      </ThemedText>
      {statParts.length > 0 ? (
        <ThemedText variant="caption" color={theme.colors.textMuted}>
          {statParts.join(' · ')}
        </ThemedText>
      ) : null}
      <ThemedText variant="caption" color={theme.colors.textMuted}>
        {serverTitle}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    gap: 6,
    paddingTop: 32,
    paddingBottom: 16,
    marginTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
});
