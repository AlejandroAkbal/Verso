import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useMemo, useRef, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type { Link, Locator, ReadiumViewRef } from 'react-native-readium';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { ReaderChrome } from '@/components/reader/ReaderChrome';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';
import { ReaderSettingsSheet } from '@/components/reader/ReaderSettingsSheet';
import { ReaderTocModal } from '@/components/reader/ReaderTocModal';
import { Box, PressableBox } from '@/components/ui';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { useReaderProgress } from '@/hooks/useReaderProgress';
import { useReaderSession } from '@/hooks/useReaderSession';
import { lightImpactHaptic } from '@/lib/haptics';
import { progressPercent } from '@/lib/readingProgress';
import { toReadiumPreferences } from '@/services/reader/preferences';
import { useTheme } from '@/theme/ThemeProvider';

function linkToLocator(link: Link): Locator {
  const href = link.href.startsWith('/') ? link.href.slice(1) : link.href;
  return {
    href,
    type: 'application/xhtml+xml',
    title: link.title,
  };
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const { t } = useTranslation();
  const { prefs, updatePrefs } = useReaderPreferences();

  const readiumRef = useRef<ReadiumViewRef>(null);
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const {
    loading,
    error,
    title,
    file,
    progression,
    setProgression,
    tableOfContents,
    setTableOfContents,
  } = useReaderSession(id);

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

  const handleTocSelect = useCallback((link: Link) => {
    void lightImpactHaptic();
    readiumRef.current?.goTo(linkToLocator(link));
    setTocVisible(false);
  }, []);

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
          }}
        />
      </Box>

      <ReaderChrome
        title={title}
        percent={percent}
        visible={chromeVisible}
        onShowChrome={() => setChromeVisible(true)}
        onHideChrome={() => setChromeVisible(false)}
        onBack={handleBack}
        onOpenToc={() => setTocVisible(true)}
        onOpenSettings={() => setSettingsVisible(true)}
      />

      <ReaderProgressBar progression={progression} visible={chromeVisible} />

      <ReaderSettingsSheet
        visible={settingsVisible}
        prefs={prefs}
        onClose={() => setSettingsVisible(false)}
        onChange={(patch) => {
          void updatePrefs(patch);
        }}
      />

      <ReaderTocModal
        visible={tocVisible}
        onClose={() => setTocVisible(false)}
        tableOfContents={tableOfContents}
        onSelect={handleTocSelect}
      />
    </Box>
  );
}
