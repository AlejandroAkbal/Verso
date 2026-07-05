import { StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';

type BookBadgeProps = {
  label: string;
};

export function BookBadge({ label }: BookBadgeProps) {
  return (
    <View style={styles.badge}>
      <ThemedText variant="caption" style={styles.text}>
        {label}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  text: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    color: '#FFFFFF',
  },
});
