import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { Image } from 'expo-image';

type BlurBackdropProps = {
  imageUrl: string;
  imageHeaders?: Record<string, string>;
  dominantColor: string;
  children: React.ReactNode;
};

export function BlurBackdrop({
  imageUrl,
  imageHeaders,
  dominantColor,
  children,
}: BlurBackdropProps) {
  return (
    <View style={styles.container}>
      <Image
        source={{
          uri: imageUrl,
          headers: imageHeaders,
        }}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
        blurRadius={40}
      />
      <View
        style={[StyleSheet.absoluteFill, { backgroundColor: dominantColor, opacity: 0.55 }]}
      />
      <BlurView intensity={60} tint="dark" style={StyleSheet.absoluteFill} />
      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
  },
});
