import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo } from 'react';

import { upsertBooks } from '@/db/queries';
import { useBooksCache } from '@/db/hooks/useBooksCache';
import type { BookRow } from '@/db/schema';
import {
  entriesToBookRows,
  fetchAllOPDSEntries,
} from '@/services/opds/parser';

type CatalogResult = {
  books: BookRow[];
  isOffline: boolean;
  error: string | null;
};

async function fetchAndCacheCatalog(
  db: ReturnType<typeof useSQLiteContext>,
  serverId: string,
  serverUrl: string,
): Promise<BookRow[]> {
  const entries = await fetchAllOPDSEntries(serverUrl, 3);
  const rows = await entriesToBookRows(entries, serverId);
  await upsertBooks(db, rows);
  return rows;
}

export function useOPDSCatalog(serverId: string | undefined, serverUrl: string | undefined) {
  const db = useSQLiteContext();
  const { books: cachedBooks, refresh: refreshCache } = useBooksCache(serverId);

  const query = useQuery({
    queryKey: ['opds-catalog', serverId, serverUrl],
    queryFn: async () => {
      if (!serverId || !serverUrl) {
        return [] as BookRow[];
      }
      return fetchAndCacheCatalog(db, serverId, serverUrl);
    },
    enabled: Boolean(serverId && serverUrl),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
    await refreshCache();
  }, [query, refreshCache]);

  const result: CatalogResult = useMemo(() => {
    if (query.isSuccess && query.data && query.data.length > 0) {
      return {
        books: query.data,
        isOffline: false,
        error: null,
      };
    }

    if (query.isError && cachedBooks.length > 0) {
      return {
        books: cachedBooks,
        isOffline: true,
        error: query.error instanceof Error ? query.error.message : 'Network error',
      };
    }

    if (query.isLoading && cachedBooks.length > 0) {
      return {
        books: cachedBooks,
        isOffline: false,
        error: null,
      };
    }

    return {
      books: query.data ?? cachedBooks,
      isOffline: query.isError,
      error: query.isError
        ? query.error instanceof Error
          ? query.error.message
          : 'Failed to load catalog'
        : null,
    };
  }, [query.isSuccess, query.data, query.isError, query.error, query.isLoading, cachedBooks]);

  return {
    ...result,
    isLoading: query.isLoading && cachedBooks.length === 0,
    isRefetching: query.isRefetching,
    refresh,
  };
}
