import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getDownloadStorageStats,
  type DownloadStorageStats,
} from '@/services/downloads/manage';
import { subscribeDownloadsChanged } from '@/services/downloads/changes';

export function useDownloadStorageStats() {
  const db = useSQLiteContext();
  const [stats, setStats] = useState<DownloadStorageStats>({ count: 0, bytes: 0 });

  const refresh = useCallback(async () => {
    const next = await getDownloadStorageStats(db);
    setStats(next);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });

    return subscribeDownloadsChanged(() => {
      void refresh();
    });
  }, [refresh]);

  return { stats, refresh };
}
