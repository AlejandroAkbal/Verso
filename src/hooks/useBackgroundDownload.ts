import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { useDownloadStatus } from '@/db/hooks/useDownloads';
import type { DownloadRow } from '@/db/schema';
import { enqueueDownload, cancelDownload as cancelDownloadQueue } from '@/services/downloads/queue';
import { isDownloadComplete, removeDownloadedBook } from '@/services/downloads/manage';
import { triggerDownloadProcessing } from '@/services/downloads/task';

type UseBackgroundDownloadOptions = {
  /** When provided, skips per-book polling (e.g. grid passes row from useDownloads). */
  download?: DownloadRow | null;
};

export function useBackgroundDownload(
  bookId: string,
  options: UseBackgroundDownloadOptions = {},
) {
  const db = useSQLiteContext();
  const polledDownload = useDownloadStatus(bookId);
  const download = options.download ?? polledDownload;

  const startDownload = useCallback(async () => {
    if (isDownloadComplete(download)) {
      return;
    }
    await enqueueDownload(db, bookId);
    await triggerDownloadProcessing(db);
  }, [db, bookId, download]);

  const removeDownload = useCallback(async () => {
    await removeDownloadedBook(db, bookId);
  }, [db, bookId]);

  const cancelDownload = useCallback(async () => {
    await cancelDownloadQueue(db, bookId);
  }, [db, bookId]);

  const status = download?.status ?? null;
  const progress = download?.progress ?? 0;
  const isDownloading = status === 'queued' || status === 'downloading';
  const isCompleted = isDownloadComplete(download);
  const isFailed = status === 'failed';

  return {
    download,
    status,
    progress,
    isDownloading,
    isCompleted,
    isFailed,
    startDownload,
    removeDownload,
    cancelDownload,
  };
}
