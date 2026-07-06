import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';

type BookBadgeProps = {
  label: string;
};

export function BookBadge({ label }: BookBadgeProps) {
  return (
    <Box
      position="absolute"
      top={6}
      left={6}
      backgroundColor="overlay"
      borderRadius="sm"
      paddingHorizontal="xs"
    >
      <ThemedText
        variant="caption"
        color="#FFFFFF"
        style={{
          fontSize: 9,
          fontWeight: '700',
          letterSpacing: 0.6,
          textTransform: 'uppercase',
        }}
      >
        {label}
      </ThemedText>
    </Box>
  );
}
