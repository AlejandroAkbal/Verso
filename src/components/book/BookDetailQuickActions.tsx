import { Alert, Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import type { BookRow, DownloadRow } from '@/db/schema';
import { formatStorageSize } from '@/services/downloads/manage';
import { formatLabelFromMime, shareDownloadedBookFile } from '@/services/downloads/share';
import { useTheme } from '@/theme/ThemeProvider';

type BookDetailQuickActionsProps = {
  book: BookRow;
  download: DownloadRow | null | undefined;
  isDownloaded: boolean;
  onRemoveDownload: () => void;
};

export function BookDetailQuickActions({
  book,
  download,
  isDownloaded,
  onRemoveDownload,
}: BookDetailQuickActionsProps) {
  const theme = useTheme();
  const { t } = useTranslation();

  const handleShareFile = async () => {
    if (!download?.local_uri) return;

    try {
      await shareDownloadedBookFile(download.local_uri, {
        title: book.title,
        mime: book.mime,
      });
    } catch {
      Alert.alert(t('book.shareFile'), t('book.shareFileError'));
    }
  };

  const fileSize =
    isDownloaded && download
      ? formatStorageSize(download.bytes_total || download.bytes_written || 0)
      : null;

  if (!isDownloaded) {
    return (
      <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.meta}>
        {formatLabelFromMime(book.mime)}
      </ThemedText>
    );
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.row}>
        <Pressable
          style={[styles.chip, { backgroundColor: theme.colors.secondary }]}
          onPress={() => void handleShareFile()}
        >
          <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.colors.text} />
          <ThemedText variant="caption" color={theme.colors.textSecondary}>
            {t('book.shareFile')}
          </ThemedText>
        </Pressable>
        <Pressable
          style={[styles.chip, { backgroundColor: theme.colors.secondary }]}
          onPress={onRemoveDownload}
        >
          <SymbolView name="trash" size={18} tintColor={theme.colors.error} />
          <ThemedText variant="caption" color={theme.colors.error}>
            {t('downloads.remove')}
          </ThemedText>
        </Pressable>
      </View>
      {fileSize ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={styles.meta}>
          {t('book.fileDetails', {
            format: formatLabelFromMime(book.mime),
            size: fileSize,
          })}
        </ThemedText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  chip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 48,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  meta: {
    textAlign: 'center',
  },
});
