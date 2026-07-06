import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { subscribeDownloadsChanged } from '@/services/downloads/changes';

import { getAllDownloads, getDownloadByBookId } from '../queries';
import type { DownloadRow } from '../schema';

const ACTIVE_POLL_MS = 300;
const IDLE_POLL_MS = 2500;

export function useDownloads() {
  const db = useSQLiteContext();
  const [downloads, setDownloads] = useState<DownloadRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await getAllDownloads(db);
    setDownloads(rows);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    const interval = setInterval(() => {
      void refresh();
    }, ACTIVE_POLL_MS);

    const unsubscribe = subscribeDownloadsChanged(() => {
      void refresh();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [refresh]);

  return { downloads, loading, refresh };
}

export function useDownloadStatus(bookId: string) {
  const db = useSQLiteContext();
  const [download, setDownload] = useState<DownloadRow | null>(null);

  const refresh = useCallback(async () => {
    if (!bookId) {
      setDownload(null);
      return;
    }
    const row = await getDownloadByBookId(db, bookId);
    setDownload(row);
  }, [bookId, db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });

    const pollMs =
      download?.status === 'downloading' || download?.status === 'queued'
        ? ACTIVE_POLL_MS
        : IDLE_POLL_MS;

    const interval = setInterval(() => {
      void refresh();
    }, pollMs);

    const unsubscribe = subscribeDownloadsChanged(() => {
      void refresh();
    });

    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [download?.status, refresh]);

  return download;
}
