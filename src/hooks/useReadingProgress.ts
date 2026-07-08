import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getAllReadingProgress } from '@/db/queries';
import type { ReadingProgressRow } from '@/db/schema';
import { subscribeReadingProgressChanged } from '@/services/readingProgress/changes';

export function useReadingProgressMap() {
  const db = useSQLiteContext();
  const [progressByBookId, setProgressByBookId] = useState<
    Map<string, ReadingProgressRow>
  >(new Map());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const rows = await getAllReadingProgress(db);
      setProgressByBookId(new Map(rows.map((row) => [row.book_id, row])));
    } catch (e) {
      console.error('Failed to load reading progress:', e);
    } finally {
      setLoading(false);
    }
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
    return subscribeReadingProgressChanged(() => {
      void refresh();
    });
  }, [refresh]);

  return { progressByBookId, loading, refresh };
}
