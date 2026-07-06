import { useCallback, useEffect, useRef, useState } from 'react';
import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { registerToastHandler, type ToastVariant } from '@/lib/toast';
import { theme } from '@/theme/theme';

const TOAST_MS = 3500;

type ToastPayload = {
  id: number;
  message: string;
  variant: ToastVariant;
};

function toastBackground(variant: ToastVariant): string {
  switch (variant) {
    case 'error':
      return theme.colors.surfaceElevated;
    case 'success':
      return theme.colors.surfaceElevated;
    default:
      return theme.colors.surfaceElevated;
  }
}

function toastAccent(variant: ToastVariant): string {
  switch (variant) {
    case 'error':
      return theme.colors.error;
    case 'success':
      return theme.colors.success;
    default:
      return theme.colors.textSecondary;
  }
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastPayload | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idRef = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
    setToast(null);
  }, []);

  const present = useCallback(
    (message: string, variant: ToastVariant) => {
      if (timer.current) {
        clearTimeout(timer.current);
      }
      idRef.current += 1;
      const id = idRef.current;
      setToast({ id, message, variant });
      timer.current = setTimeout(() => {
        setToast((current) => (current?.id === id ? null : current));
        timer.current = null;
      }, TOAST_MS);
    },
    [],
  );

  useEffect(() => {
    registerToastHandler(present);
    return () => registerToastHandler(undefined);
  }, [present]);

  return (
    <>
      {children}
      {toast ? (
        <Box
          pointerEvents="box-none"
          position="absolute"
          left={0}
          right={0}
          bottom={0}
          style={{ paddingBottom: insets.bottom + 12, paddingHorizontal: 16 }}
        >
          <Animated.View entering={FadeInUp.duration(220)} exiting={FadeOutUp.duration(180)}>
            <PressableBox onPress={dismiss} accessibilityRole="button">
              <Box
                borderRadius="lg"
                paddingHorizontal="md"
                paddingVertical="sm"
                style={{
                  backgroundColor: toastBackground(toast.variant),
                  borderLeftWidth: 3,
                  borderLeftColor: toastAccent(toast.variant),
                  shadowColor: '#000',
                  shadowOpacity: 0.35,
                  shadowRadius: 12,
                  shadowOffset: { width: 0, height: 4 },
                }}
              >
                <ThemedText variant="body" numberOfLines={3}>
                  {toast.message}
                </ThemedText>
              </Box>
            </PressableBox>
          </Animated.View>
        </Box>
      ) : null}
    </>
  );
}
