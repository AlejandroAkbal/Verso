import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getAllReadingProgress } from '@/db/queries';
import type { ReadingProgressRow } from '@/db/schema';

export function useReadingProgressMap() {
  const db = useSQLiteContext();
  const [progressByBookId, setProgressByBookId] = useState<
    Map<string, ReadingProgressRow>
  >(new Map());

  const refresh = useCallback(async () => {
    const rows = await getAllReadingProgress(db);
    setProgressByBookId(new Map(rows.map((row) => [row.book_id, row])));
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    const interval = setInterval(() => {
      void refresh();
    }, 3000);
    return () => clearInterval(interval);
  }, [refresh]);

  return { progressByBookId, refresh };
}
