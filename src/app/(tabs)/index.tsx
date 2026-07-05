import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';

import { BookCard } from '@/components/BookCard';
import { OfflineBanner } from '@/components/OfflineBanner';
import { ThemedText } from '@/components/ThemedText';
import { useServers } from '@/db/hooks/useServers';
import { useOPDSCatalog } from '@/hooks/useOPDSCatalog';
import type { BookRow } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';

export default function CatalogScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { servers, loading: serversLoading } = useServers();
  const [selectedServerIndex, setSelectedServerIndex] = useState(0);

  const activeServer = servers[selectedServerIndex];
  const { books, isOffline, isLoading, isRefetching, refresh } = useOPDSCatalog(
    activeServer?.id,
    activeServer?.url,
  );

  const numColumns = theme.grid.numColumns;
  const cardWidth = useMemo(() => {
    const totalGap = theme.grid.gap * (numColumns - 1);
    const totalPadding = theme.grid.horizontalPadding * 2;
    return (width - totalPadding - totalGap) / numColumns;
  }, [width, numColumns, theme.grid.gap, theme.grid.horizontalPadding]);

  const renderItem = useCallback(
    ({ item }: { item: BookRow }) => (
      <View style={{ marginBottom: theme.grid.gap }}>
        <BookCard book={item} width={cardWidth} />
      </View>
    ),
    [cardWidth, theme.grid.gap],
  );

  if (serversLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.text} />
      </View>
    );
  }

  if (servers.length === 0) {
    return (
      <View style={styles.centered}>
        <ThemedText variant="subtitle">No OPDS servers configured</ThemedText>
        <Pressable onPress={() => router.push('/settings')} style={styles.linkButton}>
          <ThemedText color={theme.colors.textSecondary}>Add a server</ThemedText>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <View>
          <ThemedText variant="title">Verso</ThemedText>
          <Pressable
            onPress={() => {
              setSelectedServerIndex((prev) => (prev + 1) % servers.length);
            }}
          >
            <ThemedText variant="caption" color={theme.colors.textSecondary}>
              {activeServer?.title ?? 'Catalog'}
            </ThemedText>
          </Pressable>
        </View>
        <Pressable onPress={() => router.push('/settings')} hitSlop={12}>
          <SymbolView name="gearshape" size={22} tintColor={theme.colors.textSecondary} />
        </Pressable>
      </View>

      <OfflineBanner visible={isOffline} />

      {isLoading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={theme.colors.text} />
        </View>
      ) : (
        <FlashList
          data={books}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={numColumns}
          contentContainerStyle={{
            paddingHorizontal: theme.grid.horizontalPadding,
            paddingBottom: insets.bottom + 24,
            paddingTop: theme.spacing.md,
          }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={() => void refresh()}
              tintColor={theme.colors.text}
            />
          }
          ListEmptyComponent={
            <View style={styles.centered}>
              <ThemedText color={theme.colors.textSecondary}>
                No books found in this catalog
              </ThemedText>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 12,
  },
  linkButton: {
    padding: 8,
  },
});
