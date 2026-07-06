import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getReadingProgress } from '@/db/queries';
import type { ReadingProgressRow } from '@/db/schema';

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
    const interval = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { progress, refresh };
}
