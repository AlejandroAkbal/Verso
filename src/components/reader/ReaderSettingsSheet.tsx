import { Modal } from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import type { StoredReaderPreferences } from '@/services/reader/preferences';
import { useTheme } from '@/theme/ThemeProvider';

type ReaderSettingsSheetProps = {
  visible: boolean;
  prefs: StoredReaderPreferences;
  onClose: () => void;
  onChange: (patch: Partial<StoredReaderPreferences>) => void;
};

export function ReaderSettingsSheet({
  visible,
  prefs,
  onClose,
  onChange,
}: ReaderSettingsSheetProps) {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <Box
        flex={1}
        backgroundColor="background"
        style={{
          paddingTop: insets.top + 12,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <Box
          flexDirection="row"
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="lg"
          marginBottom="md"
        >
          <ThemedText variant="title">{t('reader.settingsTitle')}</ThemedText>
          <PressableBox
            onPress={onClose}
            hitSlop={8}
            alignItems="center"
            justifyContent="center"
            width={36}
            height={36}
            borderRadius="full"
            backgroundColor="surfaceElevated"
          >
            <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
        </Box>

        <ScrollBox contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}>
          <ReaderSettingsPanel prefs={prefs} onChange={onChange} />
        </ScrollBox>
      </Box>
    </Modal>
  );
}
