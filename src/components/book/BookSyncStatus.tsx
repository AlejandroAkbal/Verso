import { SymbolView, type SymbolViewProps } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';
import { useBookSyncStatus } from '@/hooks/useBookSyncStatus';
import { formatRelativeTime } from '@/lib/relativeTime';
import { useTheme } from '@/theme/ThemeProvider';

type BookSyncStatusProps = {
  bookId: string;
  /** Sync only applies to books that are on device. */
  isDownloaded: boolean;
};

export function BookSyncStatus({ bookId, isDownloaded }: BookSyncStatusProps) {
  const theme = useTheme();
  const { t, i18n } = useTranslation();
  const { active, sync } = useBookSyncStatus(bookId);

  if (!active || !isDownloaded) {
    return null;
  }

  const lastSyncedAt = Math.max(sync?.last_pushed_at ?? 0, sync?.last_pulled_at ?? 0);
  const hasSynced = lastSyncedAt > 0;
  const hasError = Boolean(sync?.last_error);

  // A stale error after a later successful sync is not worth surfacing.
  const showError = hasError && !hasSynced;

  let icon: SymbolViewProps['name'] = 'arrow.triangle.2.circlepath';
  let tint: string = theme.colors.textMuted;
  let text: string;

  if (showError) {
    icon = 'exclamationmark.icloud';
    tint = theme.colors.error;
    text = t('sync.lastError', { message: sync?.last_error });
  } else if (hasSynced) {
    icon = 'checkmark.icloud';
    tint = theme.colors.textSecondary;
    text = t('sync.statusSynced', {
      time: formatRelativeTime(i18n.language, lastSyncedAt),
    });
  } else {
    text = t('sync.statusPending');
  }

  const remotePercent =
    !showError && sync?.remote_percentage != null
      ? Math.round(sync.remote_percentage * 100)
      : null;

  return (
    <Box
      flexDirection="row"
      alignItems="center"
      justifyContent="center"
      gap="xs"
      testID="book-sync-status"
    >
      <SymbolView name={icon} size={13} tintColor={tint} />
      <ThemedText variant="caption" color={tint} numberOfLines={1}>
        {text}
        {remotePercent != null ? ` · ${remotePercent}%` : ''}
      </ThemedText>
    </Box>
  );
}
