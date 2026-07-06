import { Alert } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import type { BookRow, DownloadRow } from '@/db/schema';
import {
  formatStorageSize,
  resolveDownloadLocalUri,
} from '@/services/downloads/manage';
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
      await shareDownloadedBookFile(resolveDownloadLocalUri(download), {
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
      <ThemedText variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
        {formatLabelFromMime(book.mime)}
      </ThemedText>
    );
  }

  return (
    <Box gap="sm" alignItems="center">
      <Box flexDirection="row" gap="sm" width="100%">
        <PressableBox
          flex={1}
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap="sm"
          minHeight={48}
          borderRadius="lg"
          paddingHorizontal="md"
          paddingVertical="sm"
          backgroundColor="secondary"
          onPress={() => void handleShareFile()}
        >
          <SymbolView name="square.and.arrow.up" size={18} tintColor={theme.colors.text} />
          <ThemedText variant="caption" color={theme.colors.textSecondary}>
            {t('book.shareFile')}
          </ThemedText>
        </PressableBox>
        <PressableBox
          flex={1}
          flexDirection="row"
          alignItems="center"
          justifyContent="center"
          gap="sm"
          minHeight={48}
          borderRadius="lg"
          paddingHorizontal="md"
          paddingVertical="sm"
          backgroundColor="secondary"
          onPress={onRemoveDownload}
        >
          <SymbolView name="trash" size={18} tintColor={theme.colors.error} />
          <ThemedText variant="caption" color={theme.colors.error}>
            {t('downloads.remove')}
          </ThemedText>
        </PressableBox>
      </Box>
      {fileSize ? (
        <ThemedText variant="caption" color={theme.colors.textMuted} style={{ textAlign: 'center' }}>
          {t('book.fileDetails', {
            format: formatLabelFromMime(book.mime),
            size: fileSize,
          })}
        </ThemedText>
      ) : null}
    </Box>
  );
}
