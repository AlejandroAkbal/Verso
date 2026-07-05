import { Pressable, StyleSheet, View } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ProgressRing } from '@/components/ProgressRing';
import { useBackgroundDownload } from '@/hooks/useBackgroundDownload';
import { useTheme } from '@/theme/ThemeProvider';

type BookDetailPrimaryActionProps = {
  bookId: string;
  onRead: () => void;
  continuePercent: number | null;
  isFinished: boolean;
};

export function BookDetailPrimaryAction({
  bookId,
  onRead,
  continuePercent,
  isFinished,
}: BookDetailPrimaryActionProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const { isDownloading, isCompleted, isFailed, progress, startDownload } =
    useBackgroundDownload(bookId);

  if (isCompleted) {
    const label =
      continuePercent != null && continuePercent > 0 && !isFinished
        ? t('book.continueReading', { percent: continuePercent })
        : t('book.read');

    return (
      <Pressable
        style={[styles.primary, { backgroundColor: theme.colors.primary }]}
        onPress={onRead}
      >
        <SymbolView name="book.fill" size={18} tintColor={theme.colors.onPrimary} />
        <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
          {label}
        </ThemedText>
      </Pressable>
    );
  }

  if (isDownloading) {
    const percent = Math.round(progress * 100);
    return (
      <View style={[styles.primary, styles.disabled, { borderColor: theme.colors.border }]}>
        <ProgressRing progress={progress} size={22} strokeWidth={2} />
        <ThemedText variant="subtitle" color={theme.colors.textSecondary}>
          {t('book.downloading', { percent })}
        </ThemedText>
      </View>
    );
  }

  if (isFailed) {
    return (
      <Pressable
        style={[styles.primary, { borderColor: theme.colors.error, borderWidth: 1 }]}
        onPress={() => void startDownload()}
      >
        <SymbolView name="arrow.clockwise" size={18} tintColor={theme.colors.error} />
        <ThemedText variant="subtitle" color={theme.colors.error}>
          {t('book.downloadFailed')}
        </ThemedText>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={[styles.primary, { backgroundColor: theme.colors.primary }]}
      onPress={() => void startDownload()}
    >
      <SymbolView name="icloud.and.arrow.down" size={18} tintColor={theme.colors.onPrimary} />
      <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
        {t('book.download')}
      </ThemedText>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  primary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    minHeight: 50,
    borderRadius: 9999,
    paddingHorizontal: 24,
  },
  disabled: {
    backgroundColor: 'transparent',
    borderWidth: StyleSheet.hairlineWidth,
  },
});
