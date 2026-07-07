import { useMemo } from 'react';
import { Modal } from 'react-native';
import type { Link } from 'react-native-readium';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';

type TocEntry = { link: Link; depth: number };

function flattenToc(links: Link[], depth = 0): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const link of links) {
    entries.push({ link, depth });
    if (link.children?.length) {
      entries.push(...flattenToc(link.children, depth + 1));
    }
  }
  return entries;
}

type ReaderTocModalProps = {
  visible: boolean;
  onClose: () => void;
  tableOfContents: Link[];
  onSelect: (link: Link) => void;
};

export function ReaderTocModal({
  visible,
  onClose,
  tableOfContents,
  onSelect,
}: ReaderTocModalProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const entries = useMemo(() => flattenToc(tableOfContents), [tableOfContents]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box flex={1} backgroundColor="background" paddingHorizontal="lg" paddingTop="lg">
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          marginBottom="md"
        >
          <ThemedText variant="title">{t('reader.tableOfContents')}</ThemedText>
          <PressableBox onPress={onClose} hitSlop={12}>
            <ThemedText
              style={{ color: theme.colors.interactive, fontSize: 17, fontWeight: '600' }}
            >
              {t('common.done')}
            </ThemedText>
          </PressableBox>
        </Box>
        {entries.length === 0 ? (
          <Box flex={1} alignItems="center" justifyContent="center">
            <ThemedText color={theme.colors.textMuted}>{t('reader.noChapters')}</ThemedText>
          </Box>
        ) : (
          <ScrollBox contentContainerStyle={{ paddingBottom: 24 }}>
            {entries.map(({ link, depth }) => (
              <PressableBox
                key={`${link.href}-${depth}-${link.title ?? ''}`}
                onPress={() => onSelect(link)}
                paddingRight="sm"
                style={{ paddingLeft: 16 + depth * 16, paddingVertical: 12 }}
              >
                <ThemedText numberOfLines={2}>{link.title ?? link.href}</ThemedText>
              </PressableBox>
            ))}
          </ScrollBox>
        )}
      </Box>
    </Modal>
  );
}
