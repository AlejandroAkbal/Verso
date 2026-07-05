import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getAllCachedBooks, getBooksByServerId } from '../queries';
import type { BookRow } from '../schema';

export function useBooksCache(serverId?: string) {
  const db = useSQLiteContext();
  const [books, setBooks] = useState<BookRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = serverId
      ? await getBooksByServerId(db, serverId)
      : await getAllCachedBooks(db);
    setBooks(rows);
    setLoading(false);
  }, [db, serverId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { books, loading, refresh };
}
