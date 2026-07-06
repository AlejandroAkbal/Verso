import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type {
  Link,
  Locator,
  ReadiumFile,
  ReadiumViewRef,
} from 'react-native-readium';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/ThemedText';
import { ReaderChrome } from '@/components/reader/ReaderChrome';
import { ReaderProgressBar } from '@/components/reader/ReaderProgressBar';
import { ReaderSettingsSheet } from '@/components/reader/ReaderSettingsSheet';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import {
  acknowledgeBook,
  getBookById,
  getDownloadByBookId,
  getReadingProgress,
  setLastOpenBookId,
  upsertReadingProgress,
} from '@/db/queries';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { lightImpactHaptic } from '@/lib/haptics';
import { promptSyncConflict } from '@/lib/syncPrompt';
import {
  parseStoredLocator,
  progressionFromLocator,
  progressPercent,
} from '@/lib/readingProgress';
import { resolveDownloadLocalUri } from '@/services/downloads/manage';
import {
  applyRemotePercentage,
  pullRemoteProgressForBook,
  pushLocalProgressForBook,
} from '@/services/koreader/syncBook';
import { toReadiumPreferences } from '@/services/reader/preferences';
import { useTheme } from '@/theme/ThemeProvider';

const PROGRESS_SAVE_MS = 800;

function isEpubMime(mime: string): boolean {
  const normalized = mime.toLowerCase();
  return normalized.includes('epub') || normalized.endsWith('+zip');
}

function linkToLocator(link: Link): Locator {
  const href = link.href.startsWith('/') ? link.href.slice(1) : link.href;
  return {
    href,
    type: 'application/xhtml+xml',
    title: link.title,
  };
}

type TocEntry = { link: Link; depth: number };

function flattenToc(links: Link[], depth = 0): TocEntry[] {
  const entries: TocEntry[] = [];
  for (const link of links) {
    entries.push({ link, depth });
    if (link.children?.length) {
      entries.push(...flattenToc(link.children, depth + 1));
    }
  }
  return entries;
}

export default function ReaderScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const db = useSQLiteContext();
  const theme = useTheme();
  const { t } = useTranslation();
  const { prefs, updatePrefs } = useReaderPreferences();

  const readiumRef = useRef<ReadiumViewRef>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLocator = useRef<Locator | null>(null);
  const pendingProgression = useRef(0);
  const positionCountRef = useRef<number | undefined>(undefined);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<ReadiumFile | null>(null);
  const [progression, setProgression] = useState(0);
  const [tableOfContents, setTableOfContents] = useState<Link[]>([]);
  const [tocVisible, setTocVisible] = useState(false);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      void (async () => {
        if (!id) return;

        const openWithLocalProgress = async () => {
          const book = await getBookById(db, id);
          const download = await getDownloadByBookId(db, id);
          const saved = await getReadingProgress(db, id);

          if (!book || !download?.local_uri) {
            setError(t('reader.bookNotDownloaded'));
            setLoading(false);
            return;
          }

          if (!isEpubMime(book.mime)) {
            setError(t('reader.unsupportedFormat'));
            setLoading(false);
            return;
          }

          const initialLocation = parseStoredLocator(saved?.locator_json ?? '');
          const localUri = resolveDownloadLocalUri(download);

          setTitle(book.title);
          setFile({
            url: localUri,
            initialLocation,
          });
          setProgression(saved?.progression ?? 0);
          setLoading(false);
        };

        try {
          await acknowledgeBook(db, id);
          await setLastOpenBookId(db, id);

          const pull = await pullRemoteProgressForBook(db, id);

          if (pull.hasConflict && pull.remote) {
            promptSyncConflict(
              t,
              () => {
                void applyRemotePercentage(db, id, pull.remote!.percentage).then(
                  openWithLocalProgress,
                );
              },
              openWithLocalProgress,
            );
            return;
          }

          await openWithLocalProgress();
        } catch (err) {
          setError(err instanceof Error ? err.message : t('reader.loadFailed'));
          setLoading(false);
        }
      })();
    });
  }, [db, id, t]);

  const flushProgress = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!id || !pendingLocator.current) return;

    const locator = pendingLocator.current;
    pendingLocator.current = null;

    await upsertReadingProgress(db, {
      book_id: id,
      progression: pendingProgression.current,
      locator_json: JSON.stringify(locator),
      updated_at: Date.now(),
    });
    await pushLocalProgressForBook(db, id, {
      force: true,
      positionCount: positionCountRef.current,
    });
  }, [db, id]);

  const persistProgress = useCallback(
    (locator: Locator) => {
      if (!id) return;

      const nextProgression = progressionFromLocator(locator);
      setProgression(nextProgression);
      pendingLocator.current = locator;
      pendingProgression.current = nextProgression;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void flushProgress();
        void pushLocalProgressForBook(db, id, {
          positionCount: positionCountRef.current,
        });
      }, PROGRESS_SAVE_MS);
    },
    [db, flushProgress, id],
  );

  useEffect(() => {
    return () => {
      void flushProgress();
    };
  }, [flushProgress]);

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
  const tocEntries = useMemo(() => flattenToc(tableOfContents), [tableOfContents]);

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
            positionCountRef.current = event.positions.length;
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

      <Modal
        visible={tocVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTocVisible(false)}
      >
        <Box flex={1} backgroundColor="background" paddingHorizontal="lg" paddingTop="lg">
          <Box
            flexDirection="row"
            alignItems="center"
            justifyContent="space-between"
            marginBottom="md"
          >
            <ThemedText variant="title">{t('reader.tableOfContents')}</ThemedText>
            <PressableBox onPress={() => setTocVisible(false)} hitSlop={12}>
              <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
            </PressableBox>
          </Box>
          {tocEntries.length === 0 ? (
            <Box flex={1} alignItems="center" justifyContent="center">
              <ThemedText color={theme.colors.textMuted}>{t('reader.noChapters')}</ThemedText>
            </Box>
          ) : (
            <ScrollBox contentContainerStyle={{ paddingBottom: 24 }}>
              {tocEntries.map(({ link, depth }) => (
                <PressableBox
                  key={`${link.href}-${depth}-${link.title ?? ''}`}
                  onPress={() => handleTocSelect(link)}
                  paddingRight="sm"
                  style={{ paddingLeft: 16 + depth * 16, paddingVertical: 12 }}
                >
                  <ThemedText numberOfLines={2}>
                    {link.title ?? link.href}
                  </ThemedText>
                </PressableBox>
              ))}
            </ScrollBox>
          )}
        </Box>
      </Modal>
    </Box>
  );
}
