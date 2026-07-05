import { StyleSheet, View } from 'react-native';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { Pressable } from 'react-native';

import type { BookRow } from '@/db/schema';
import { useTheme } from '@/theme/ThemeProvider';
import { CloudDownloadButton } from './CloudDownloadButton';

type BookCardProps = {
  book: BookRow;
  width: number;
};

export function BookCard({ book, width }: BookCardProps) {
  const theme = useTheme();
  const router = useRouter();
  const height = width / theme.cover.aspectRatio;

  return (
    <View style={[styles.container, { width, height }]}>
      <Pressable
        style={StyleSheet.absoluteFill}
        onPress={() => router.push(`/book/${book.id}`)}
      >
        <Image
          source={{ uri: book.cover_url }}
          style={[styles.cover, { borderRadius: theme.cover.borderRadius }]}
          contentFit="cover"
          placeholder={book.blurhash ? { blurhash: book.blurhash } : undefined}
          transition={200}
        />
      </Pressable>
      <View style={styles.cloudButton}>
        <CloudDownloadButton bookId={book.id} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    overflow: 'hidden',
  },
  cover: {
    width: '100%',
    height: '100%',
    backgroundColor: '#141414',
  },
  cloudButton: {
    position: 'absolute',
    bottom: 6,
    right: 6,
  },
});
