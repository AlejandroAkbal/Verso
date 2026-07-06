import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';
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
    <Box
      alignItems="center"
      gap="xs"
      paddingTop="xl"
      paddingBottom="md"
      marginTop="sm"
      borderTopWidth={0.5}
      borderTopColor="border"
    >
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
    </Box>
  );
}
