import { useCallback } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { useDownloadStatus } from '@/db/hooks/useDownloads';
import { enqueueDownload } from '@/services/downloads/queue';
import { triggerDownloadProcessing } from '@/services/downloads/task';

export function useBackgroundDownload(bookId: string) {
  const db = useSQLiteContext();
  const download = useDownloadStatus(bookId);

  const startDownload = useCallback(async () => {
    await enqueueDownload(db, bookId);
    await triggerDownloadProcessing();
  }, [db, bookId]);

  const status = download?.status ?? null;
  const progress = download?.progress ?? 0;
  const isDownloading = status === 'queued' || status === 'downloading';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  return {
    download,
    status,
    progress,
    isDownloading,
    isCompleted,
    isFailed,
    startDownload,
  };
}
