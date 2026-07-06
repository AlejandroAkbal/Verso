import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getBookSyncState } from '@/db/queries';
import type { BookSyncStateRow } from '@/db/schema';
import { isSyncActive } from '@/services/koreader/syncBook';

export type BookSyncStatus = {
  /** KOReader sync is enabled and an account is configured. */
  active: boolean;
  sync: BookSyncStateRow | null;
  refresh: () => Promise<void>;
};

export function useBookSyncStatus(bookId: string): BookSyncStatus {
  const db = useSQLiteContext();
  const [active, setActive] = useState(false);
  const [sync, setSync] = useState<BookSyncStateRow | null>(null);

  const refresh = useCallback(async () => {
    if (!bookId) {
      setActive(false);
      setSync(null);
      return;
    }
    const enabled = await isSyncActive(db);
    setActive(enabled);
    setSync(enabled ? await getBookSyncState(db, bookId) : null);
  }, [bookId, db]);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  return { active, sync, refresh };
}
