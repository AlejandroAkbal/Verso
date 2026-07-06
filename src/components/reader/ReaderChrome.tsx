import { BlurView } from 'expo-blur';
import { SymbolView } from 'expo-symbols';
import { useEffect } from 'react';
import { Platform, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox } from '@/components/ui';
import { lightImpactHaptic, selectionHaptic } from '@/lib/haptics';
import { useTheme } from '@/theme/ThemeProvider';

const CHROME_FADE_MS = 220;
const AUTO_HIDE_MS = 4000;

type ReaderChromeProps = {
  title: string;
  percent: number | null;
  visible: boolean;
  onShowChrome: () => void;
  onHideChrome: () => void;
  onBack: () => void;
  onOpenToc: () => void;
  onOpenSettings: () => void;
};

export function ReaderChrome({
  title,
  percent,
  visible,
  onShowChrome,
  onHideChrome,
  onBack,
  onOpenToc,
  onOpenSettings,
}: ReaderChromeProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const opacity = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    opacity.value = withTiming(visible ? 1 : 0, { duration: CHROME_FADE_MS });
  }, [opacity, visible]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: (1 - opacity.value) * -12 }],
  }));

  useEffect(() => {
    if (!visible) {
      return;
    }
    const timer = setTimeout(onHideChrome, AUTO_HIDE_MS);
    return () => clearTimeout(timer);
  }, [onHideChrome, visible, title, percent]);

  const chromeBackground =
    Platform.OS === 'ios' ? (
      <BlurView intensity={48} tint="dark" style={StyleSheet.absoluteFill} />
    ) : (
      <Box
        position="absolute"
        top={0}
        right={0}
        bottom={0}
        left={0}
        backgroundColor="overlay"
      />
    );

  return (
    <>
      {!visible ? (
        <PressableBox
          position="absolute"
          style={{ top: '28%', bottom: '28%', left: '22%', right: '22%' }}
          onPress={() => {
            void lightImpactHaptic();
            onShowChrome();
          }}
          accessibilityLabel={t('reader.showControls')}
        />
      ) : null}

      <Animated.View
        pointerEvents={visible ? 'box-none' : 'none'}
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            paddingTop: insets.top + 8,
            paddingHorizontal: 16,
            paddingBottom: 12,
            borderBottomWidth: StyleSheet.hairlineWidth,
            borderBottomColor: theme.colors.border,
            overflow: 'hidden',
          },
          animatedStyle,
        ]}
      >
        {chromeBackground}
        <Box flexDirection="row" alignItems="center" gap="md">
          <PressableBox
            onPress={onBack}
            hitSlop={12}
            testID="reader-back"
            accessibilityLabel={t('common.goBack')}
          >
            <SymbolView name="chevron.down" size={18} tintColor={theme.colors.text} />
          </PressableBox>
          <Box flex={1} gap="xxs">
            <ThemedText variant="subtitle" numberOfLines={1}>
              {title}
            </ThemedText>
            {percent != null ? (
              <ThemedText variant="caption" color={theme.colors.textMuted}>
                {t('reader.progress', { percent })}
              </ThemedText>
            ) : null}
          </Box>
          <PressableBox
            onPress={() => {
              void selectionHaptic();
              onOpenToc();
            }}
            hitSlop={8}
            accessibilityLabel={t('reader.tableOfContents')}
          >
            <SymbolView name="list.bullet" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
          <PressableBox
            onPress={() => {
              void selectionHaptic();
              onOpenSettings();
            }}
            hitSlop={8}
            accessibilityLabel={t('reader.openSettings')}
          >
            <SymbolView name="textformat.size" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
        </Box>
      </Animated.View>
    </>
  );
}
