import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { ReadiumView } from 'react-native-readium';

import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ReaderChrome } from '@/components/reader/ReaderChrome';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';
import { Box, PressableBox } from '@/components/ui';
import { useReaderContext } from '@/context/ReaderContext';
import { useReaderProgress } from '@/hooks/useReaderProgress';
import { useCoverColor } from '@/hooks/useCoverColor';
import { useReaderSession } from '@/hooks/useReaderSession';
import { progressPercent } from '@/lib/readingProgress';
import { toReadiumPreferences } from '@/services/reader/preferences';
import { useTheme } from '@/theme/ThemeProvider';

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();

  const { readiumRef, prefs, setTableOfContents } = useReaderContext();
  const [chromeVisible, setChromeVisible] = useState(true);

  const { loading, error, title, coverUrl, blurhash, file, progression, setProgression } = useReaderSession(id);

  const chromeColors = useCoverColor(coverUrl, blurhash);

  const reduceMotion = useReducedMotion();
  const washOpacity = useSharedValue(reduceMotion ? 0 : 1);
  const washStyle = useAnimatedStyle(() => ({ opacity: washOpacity.value }));

  const startWashFade = useCallback(() => {
    // eslint-disable-next-line react-hooks/immutability
    washOpacity.value = withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) });
  }, [washOpacity]);

  const { persistProgress, flushProgress, setPositionCount } = useReaderProgress(
    id,
    setProgression,
  );

  const handleBack = useCallback(() => {
    void flushProgress().finally(() => {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/');
      }
    });
  }, [flushProgress, router]);

  const readiumPreferences = useMemo(() => toReadiumPreferences(prefs), [prefs]);



  const percent = useMemo(
    () => progressPercent({ book_id: id ?? '', progression, locator_json: '', updated_at: 0 }),
    [id, progression],
  );

  if (loading) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="md"
        paddingHorizontal="lg"
        backgroundColor="background"
      >
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  if (error || !file) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        gap="md"
        paddingHorizontal="lg"
        backgroundColor="background"
      >
        <ThemedText color={theme.colors.error}>{error ?? t('reader.loadFailed')}</ThemedText>
        <PressableBox
          onPress={() => {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/');
            }
          }}
        >
          <ThemedText color={theme.colors.textSecondary}>{t('common.goBack')}</ThemedText>
        </PressableBox>
      </Box>
    );
  }

  return (
    <Box flex={1} backgroundColor="background" testID="reader-screen">
      <Box flex={1}>
        <ReadiumView
          ref={readiumRef}
          file={file}
          preferences={readiumPreferences}
          onLocationChange={persistProgress}
          onPublicationReady={(event) => {
            setTableOfContents(event.tableOfContents);
            setPositionCount(event.positions.length);
            startWashFade();
          }}
        />
      </Box>

      <ReaderChrome
        title={title}
        percent={percent}
        tintColor={chromeColors.ambient}
        visible={chromeVisible}
        onShowChrome={() => setChromeVisible(true)}
        onHideChrome={() => setChromeVisible(false)}
        onBack={handleBack}
        onOpenToc={() => router.push('/reader/toc')}
        onOpenSettings={() => router.push('/reader/settings')}
      />

      <ReaderProgressBar progression={progression} visible={chromeVisible} />

      <Animated.View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { backgroundColor: chromeColors.ambient },
          washStyle,
        ]}
      />
    </Box>
  );
}
