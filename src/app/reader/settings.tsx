import { Pressable, ScrollView, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Stack, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useReaderContext } from '@/context/ReaderContext';

export default function ReaderSettingsScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { prefs, updatePrefs } = useReaderContext();

  const decreaseFontSize = () => {
    const minMultiplier = 0.5;
    const current = prefs.fontSize ?? 1.0;
    const next = Math.max(minMultiplier, current - 0.25);
    void updatePrefs({ fontSize: next });
  };

  const increaseFontSize = () => {
    const maxMultiplier = 3.0;
    const current = prefs.fontSize ?? 1.0;
    const next = Math.min(maxMultiplier, current + 0.25);
    void updatePrefs({ fontSize: next });
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('reader.settings', 'Appearance'),
          headerRight: () => (
            <Pressable onPress={() => router.back()} hitSlop={12}>
              <ThemedText style={{ color: theme.colors.interactive, fontSize: 17, fontWeight: '600' }}>
                {t('common.done')}
              </ThemedText>
            </Pressable>
          ),
          headerShadowVisible: false,
        }}
      />
      <Box
        flex={1}
        backgroundColor="background"
        style={{
          paddingTop: 16,
          paddingBottom: insets.bottom + 12,
        }}
      >
        <ScrollView style={{ flex: 1 }} contentInsetAdjustmentBehavior="automatic">
          <Box paddingHorizontal="lg" marginBottom="xl">
            <ThemedText
              variant="subtitle"
              color={theme.colors.textSecondary}
              style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.sm }}
            >
              {t('reader.fontSize', 'Font Size')}
            </ThemedText>

            <Box
              flexDirection="row"
              backgroundColor="surfaceElevated"
              borderRadius="xl"
              overflow="hidden"
            >
              <PressableBox
                flex={1}
                onPress={decreaseFontSize}
                padding="md"
                alignItems="center"
                style={{ borderRightWidth: 1, borderRightColor: theme.colors.border }}
              >
                <ThemedText style={{ fontSize: 16 }}>A</ThemedText>
              </PressableBox>

              <PressableBox flex={1} onPress={increaseFontSize} padding="md" alignItems="center">
                <ThemedText style={{ fontSize: 24 }}>A</ThemedText>
              </PressableBox>
            </Box>
          </Box>

          <Box paddingHorizontal="lg" marginBottom="xl">
            <ThemedText
              variant="subtitle"
              color={theme.colors.textSecondary}
              style={{ marginBottom: theme.spacing.sm, marginLeft: theme.spacing.sm }}
            >
              {t('reader.publisherStyles', 'Formatting')}
            </ThemedText>
            <Box backgroundColor="surfaceElevated" borderRadius="xl" overflow="hidden">
              <Box
                flexDirection="row"
                alignItems="center"
                justifyContent="space-between"
                padding="md"
                backgroundColor="surfaceElevated"
              >
                <ThemedText>{t('reader.usePublisherStyles', 'Publisher Styles')}</ThemedText>
                <Switch
                  value={prefs.publisherStyles ?? false}
                  onValueChange={(val) => updatePrefs({ publisherStyles: val })}
                  trackColor={{ true: theme.colors.interactive }}
                />
              </Box>
            </Box>
            <ThemedText
              color={theme.colors.textSecondary}
              style={{
                marginTop: theme.spacing.sm,
                marginLeft: theme.spacing.sm,
                fontSize: 13,
              }}
            >
              {t(
                'reader.publisherStylesDesc',
                'Disable to override fonts and colors with your device theme.',
              )}
            </ThemedText>
          </Box>
        </ScrollView>
      </Box>
    </>
  );
}
