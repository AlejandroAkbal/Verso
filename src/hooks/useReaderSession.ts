import { useEffect, useState } from 'react';
import type { Link, ReadiumFile } from 'react-native-readium';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import {
  acknowledgeBook,
  getBookById,
  getDownloadByBookId,
  getReadingProgress,
  setLastOpenBookId,
} from '@/db/queries';
import { parseStoredLocator } from '@/lib/readingProgress';
import { promptSyncConflict } from '@/lib/syncPrompt';
import { resolveDownloadLocalUri } from '@/services/downloads/paths';
import {
  applyRemotePercentage,
  pullRemoteProgressForBook,
} from '@/services/koreader/syncBook';

function isEpubMime(mime: string): boolean {
  const normalized = mime.toLowerCase();
  return normalized.includes('epub') || normalized.endsWith('+zip');
}

/**
 * Loads a book for the reader: pulls remote KOReader progress (prompting on
 * conflict), resolves the local EPUB, and exposes the Readium file + progress.
 */
export function useReaderSession(id: string | undefined) {
  const db = useSQLiteContext();
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [file, setFile] = useState<ReadiumFile | null>(null);
  const [progression, setProgression] = useState(0);
  const [tableOfContents, setTableOfContents] = useState<Link[]>([]);
  const [coverUrl, setCoverUrl] = useState<string | undefined>(undefined);
  const [blurhash, setBlurhash] = useState<string | undefined>(undefined);

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
          setCoverUrl(book.cover_url || undefined);
          setBlurhash(book.blurhash || undefined);
          setFile({ url: localUri, initialLocation });
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

  return {
    loading,
    error,
    title,
    coverUrl,
    blurhash,
    file,
    progression,
    setProgression,
    tableOfContents,
    setTableOfContents,
  };
}
