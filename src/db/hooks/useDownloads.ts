import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getAllDownloads, getDownloadByBookId } from '../queries';
import type { DownloadRow } from '../schema';

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
    }, 2000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { downloads, loading, refresh };
}

export function useDownloadStatus(bookId: string) {
  const db = useSQLiteContext();
  const [download, setDownload] = useState<DownloadRow | null>(null);

  const refresh = useCallback(async () => {
    const row = await getDownloadByBookId(db, bookId);
    setDownload(row);
  }, [db, bookId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    const interval = setInterval(() => {
      void refresh();
    }, 1000);
    return () => clearInterval(interval);
  }, [refresh]);

  return download;
}
