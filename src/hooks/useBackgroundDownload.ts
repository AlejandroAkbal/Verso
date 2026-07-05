import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { enqueueDownload } from '@/services/downloads/queue';
import { isDownloadComplete, removeDownloadedBook } from '@/services/downloads/manage';
import { triggerDownloadProcessing } from '@/services/downloads/task';

export function useBackgroundDownload(bookId: string) {
  const db = useSQLiteContext();
  const download = useDownloadStatus(bookId);

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
  };
}
