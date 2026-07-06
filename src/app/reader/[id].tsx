import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Modal } from 'react-native';
import { ReadiumView } from 'react-native-readium';
import type {
  Link,
  Locator,
  Preferences,
  ReadiumFile,
  ReadiumViewRef,
} from 'react-native-readium';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import {
  acknowledgeBook,
  getBookById,
  getDownloadByBookId,
  getReadingProgress,
  setLastOpenBookId,
  upsertReadingProgress,
} from '@/db/queries';
import { lightImpactHaptic, selectionHaptic } from '@/lib/haptics';
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
import { useTheme } from '@/theme/ThemeProvider';

const READIUM_BASE_PREFERENCES: Preferences = {
  theme: 'dark',
  publisherStyles: true,
};

const PROGRESS_SAVE_MS = 800;
const FONT_SIZE_MIN = 1.0;
const FONT_SIZE_MAX = 3.0;
const FONT_SIZE_STEP = 0.125;
const DEFAULT_FONT_SIZE = 1.0;

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
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

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
  const [fontSize, setFontSize] = useState(DEFAULT_FONT_SIZE);
  const [tableOfContents, setTableOfContents] = useState<Link[]>([]);
  const [tocVisible, setTocVisible] = useState(false);

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

  const preferences = useMemo(
    (): Preferences => ({
      ...READIUM_BASE_PREFERENCES,
      fontSize,
    }),
    [fontSize],
  );

  const tocEntries = useMemo(() => flattenToc(tableOfContents), [tableOfContents]);

  const decreaseFontSize = useCallback(() => {
    void selectionHaptic();
    setFontSize((current) =>
      Math.max(FONT_SIZE_MIN, Math.round((current - FONT_SIZE_STEP) * 1000) / 1000),
    );
  }, []);

  const increaseFontSize = useCallback(() => {
    void selectionHaptic();
    setFontSize((current) =>
      Math.min(FONT_SIZE_MAX, Math.round((current + FONT_SIZE_STEP) * 1000) / 1000),
    );
  }, []);

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
    <Box flex={1} backgroundColor="background">
      <Box
        paddingBottom="sm"
        gap="sm"
        style={{ paddingHorizontal: 20, paddingTop: insets.top + 8 }}
      >
        <Box flexDirection="row" alignItems="center" gap="md">
          <PressableBox onPress={handleBack} hitSlop={12}>
            <SymbolView name="xmark" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
          <ThemedText
            variant="caption"
            color={theme.colors.textSecondary}
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            {title}
          </ThemedText>
          <ThemedText variant="caption" color={theme.colors.textMuted}>
            {percent ?? 0}%
          </ThemedText>
        </Box>
        <Box flexDirection="row" alignItems="center" justifyContent="space-between">
          <PressableBox
            onPress={() => {
              void selectionHaptic();
              setTocVisible(true);
            }}
            hitSlop={8}
            accessibilityLabel={t('reader.tableOfContents')}
          >
            <SymbolView name="list.bullet" size={18} tintColor={theme.colors.textSecondary} />
          </PressableBox>
          <Box flexDirection="row" alignItems="center" gap="md">
            <PressableBox
              onPress={decreaseFontSize}
              hitSlop={8}
              disabled={fontSize <= FONT_SIZE_MIN}
              accessibilityLabel={t('reader.decreaseFontSize')}
            >
              <SymbolView
                name="textformat.size.smaller"
                size={18}
                tintColor={
                  fontSize <= FONT_SIZE_MIN
                    ? theme.colors.textMuted
                    : theme.colors.textSecondary
                  }
                />
            </PressableBox>
            <PressableBox
              onPress={increaseFontSize}
              hitSlop={8}
              disabled={fontSize >= FONT_SIZE_MAX}
              accessibilityLabel={t('reader.increaseFontSize')}
            >
              <SymbolView
                name="textformat.size.larger"
                size={18}
                tintColor={
                  fontSize >= FONT_SIZE_MAX
                    ? theme.colors.textMuted
                    : theme.colors.textSecondary
                  }
                />
            </PressableBox>
          </Box>
        </Box>
      </Box>

      <Box flex={1}>
        <ReadiumView
          ref={readiumRef}
          file={file}
          preferences={preferences}
          onLocationChange={persistProgress}
          onPublicationReady={(event) => {
            setTableOfContents(event.tableOfContents);
            positionCountRef.current = event.positions.length;
          }}
        />
      </Box>

      <Modal
        visible={tocVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTocVisible(false)}
      >
        <Box
          flex={1}
          backgroundColor="background"
          style={{
            paddingHorizontal: 20,
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          }}
        >
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
