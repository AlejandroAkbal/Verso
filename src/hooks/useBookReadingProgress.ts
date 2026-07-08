import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getReadingProgress } from '@/db/queries';
import type { ReadingProgressRow } from '@/db/schema';
import { subscribeReadingProgressChanged } from '@/services/readingProgress/changes';

export function useBookReadingProgress(bookId: string) {
  const db = useSQLiteContext();
  const [progress, setProgress] = useState<ReadingProgressRow | null>(null);

  const refresh = useCallback(async () => {
    if (!bookId) return;
    const row = await getReadingProgress(db, bookId);
    setProgress(row);
  }, [db, bookId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    return subscribeReadingProgressChanged((changedBookId) => {
      if (changedBookId === bookId) {
        void refresh();
      }
    });
  }, [bookId, refresh]);

  return { progress, refresh };
}
