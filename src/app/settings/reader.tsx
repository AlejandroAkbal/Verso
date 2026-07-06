import { ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReaderSettingsPanel } from '@/components/reader/ReaderSettingsPanel';
import { Box, ScrollBox } from '@/components/ui';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { useTheme } from '@/theme/ThemeProvider';

export default function ReaderSettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { prefs, loading, updatePrefs } = useReaderPreferences();

  if (loading) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" backgroundColor="background">
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  return (
    <ScrollBox
      contentContainerStyle={{
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: insets.bottom + 48,
      }}
    >
      <ReaderSettingsPanel
        prefs={prefs}
        onChange={(patch) => {
          void updatePrefs(patch);
        }}
      />
    </ScrollBox>
  );
}
