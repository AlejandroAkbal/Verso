import { useCallback, useEffect, useMemo, useSyncExternalStore } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getDownloadsSnapshot,
  initDownloadStore,
  refreshDownloadStore,
  subscribeDownloads,
} from '@/services/downloads/store';

import type { DownloadRow } from '../schema';

/**
 * All download rows, backed by the shared event-driven store. A single store
 * polls only while a download is in-flight — no per-hook polling loops.
 */
export function useDownloads() {
  const db = useSQLiteContext();
  useEffect(() => {
    initDownloadStore(db);
  }, [db]);

  const downloads = useSyncExternalStore(subscribeDownloads, getDownloadsSnapshot);
  const refresh = useCallback(() => refreshDownloadStore(), []);

  return { downloads, loading: false, refresh };
}

/** A single book's download row, derived from the shared store. */
export function useDownloadStatus(bookId: string): DownloadRow | null {
  const db = useSQLiteContext();
  useEffect(() => {
    initDownloadStore(db);
  }, [db]);

  const downloads = useSyncExternalStore(subscribeDownloads, getDownloadsSnapshot);
  return useMemo(
    () => downloads.find((d) => d.book_id === bookId) ?? null,
    [downloads, bookId],
  );
}
