import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { syncDownloadedBooksProgress } from '@/services/library/refresh';
import { showToast } from '@/lib/toast';

type UseLibraryRefreshOptions = {
  refreshCatalog: () => Promise<unknown>;
  refreshProgress: () => Promise<unknown>;
};

export function useLibraryRefresh({
  refreshCatalog,
  refreshProgress,
}: UseLibraryRefreshOptions) {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const refreshLibrary = useCallback(async () => {
    if (isRefreshing) {
      return;
    }

    setIsRefreshing(true);
    try {
      await refreshCatalog();
      const sync = await syncDownloadedBooksProgress(db);
      await refreshProgress();
      if (sync.errors > 0) {
        showToast(
          t('library.refreshSyncPartial', {
            updated: sync.updated,
            errors: sync.errors,
          }),
          'error',
        );
      } else if (sync.updated > 0) {
        showToast(
          t('library.refreshSyncSuccess', { count: sync.updated }),
          'success',
        );
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [db, isRefreshing, refreshCatalog, refreshProgress, t]);

  return { refreshLibrary, isRefreshing };
}
