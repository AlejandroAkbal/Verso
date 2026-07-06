import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';

import { getUserPreferences } from '@/db/queries';
import { pullRemoteProgressForBook } from '@/services/koreader/syncBook';

/** Pulls remote progress for the last-open book when the app returns to foreground. */
export function SyncForegroundListener() {
  const db = useSQLiteContext();

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') {
        return;
      }

      void (async () => {
        const prefs = await getUserPreferences(db);
        if (prefs.koreader_sync_enabled !== 1 || !prefs.last_open_book_id) {
          return;
        }

        await pullRemoteProgressForBook(db, prefs.last_open_book_id);
      })();
    });

    return () => subscription.remove();
  }, [db]);

  return null;
}
