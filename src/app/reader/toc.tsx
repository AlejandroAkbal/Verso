import { FlatList, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Link } from 'react-native-readium';
import { Stack, useRouter } from 'expo-router';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { useTheme } from '@/theme/ThemeProvider';
import { useReaderContext } from '@/context/ReaderContext';

export default function ReaderTocScreen() {
  const theme = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { tableOfContents, handleTocSelect } = useReaderContext();

  const renderItem = ({ item }: { item: Link }) => {
    return (
      <PressableBox
        onPress={() => handleTocSelect(item)}
        padding="md"
        borderBottomWidth={1}
        borderBottomColor="border"
      >
        <ThemedText numberOfLines={2}>{item.title || item.href}</ThemedText>
      </PressableBox>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: t('reader.tableOfContents', 'Table of Contents'),
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
        backgroundColor="surface"
        style={{
          paddingBottom: insets.bottom,
        }}
      >
        {tableOfContents.length === 0 ? (
          <Box flex={1} alignItems="center" justifyContent="center" padding="lg">
            <ThemedText color={theme.colors.textSecondary}>
              {t('reader.noToc', 'No table of contents')}
            </ThemedText>
          </Box>
        ) : (
          <FlatList
            data={tableOfContents}
            keyExtractor={(item) => item.href}
            renderItem={renderItem}
            contentContainerStyle={{ paddingBottom: 20 }}
            contentInsetAdjustmentBehavior="automatic"
          />
        )}
      </Box>
    </>
  );
}
