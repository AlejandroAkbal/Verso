import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  getSyncAccount,
  getUserPreferences,
  setKoreaderSyncEnabled,
  setResumeLastBook,
} from '@/db/queries';
import type { SyncAccountRow, UserPreferencesRow } from '@/db/schema';

export function useUserPreferences() {
  const db = useSQLiteContext();
  const [prefs, setPrefs] = useState<UserPreferencesRow | null>(null);
  const [syncAccount, setSyncAccount] = useState<SyncAccountRow | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const [nextPrefs, account] = await Promise.all([
      getUserPreferences(db),
      getSyncAccount(db),
    ]);
    setPrefs(nextPrefs);
    setSyncAccount(account);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const updateResumeLastBook = useCallback(
    async (enabled: boolean) => {
      await setResumeLastBook(db, enabled);
      await refresh();
    },
    [db, refresh],
  );

  const updateKoreaderSyncEnabled = useCallback(
    async (enabled: boolean) => {
      await setKoreaderSyncEnabled(db, enabled);
      await refresh();
    },
    [db, refresh],
  );

  return {
    prefs,
    syncAccount,
    loading,
    refresh,
    updateResumeLastBook,
    updateKoreaderSyncEnabled,
  };
}
