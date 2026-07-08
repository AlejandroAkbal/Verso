import { useQuery } from '@tanstack/react-query';
import { useSQLiteContext } from 'expo-sqlite';
import { useCallback, useMemo } from 'react';

import { getBookCountByServerId, getBooksByServerId, upsertBooks } from '@/db/queries';
import { useBooksCache } from '@/db/hooks/useBooksCache';
import type { BookRow } from '@/db/schema';
import { queryClient } from '@/lib/queryClient';
import { syncCwaCatalogProgress } from '@/services/koreader/cwaProgress';
import { getServerAuth } from '@/services/opds/credentials';
import { resolveBookListingUrl } from '@/services/opds/catalog';
import {
  entriesToBookRows,
  fetchAllOPDSEntries,
  searchOPDSEntries,
} from '@/services/opds/parser';

type CatalogResult = {
  books: BookRow[];
  isOffline: boolean;
  error: string | null;
  searchUrl: string | null;
};

const CATALOG_MAX_PAGES = 50;

async function fetchAndCacheCatalog(
  db: ReturnType<typeof useSQLiteContext>,
  serverId: string,
  serverUrl: string,
  authUsername: string,
): Promise<{ books: BookRow[]; searchUrl: string | null }> {
  const auth = await getServerAuth(serverId, authUsername);
  const listingUrl = await resolveBookListingUrl(serverUrl, auth);
  const { entries, searchUrl } = await fetchAllOPDSEntries(
    listingUrl,
    CATALOG_MAX_PAGES,
    auth,
  );
  const existingCount = await getBookCountByServerId(db, serverId);
  const rows = await entriesToBookRows(entries, serverId);
  const normalizedRows = existingCount === 0
    ? rows.map((book) => ({ ...book, cached_at: 0 }))
    : rows;
  await upsertBooks(db, normalizedRows);
  const cachedRows = await getBooksByServerId(db, serverId);
  await syncCwaCatalogProgress(
    db,
    { id: serverId, url: serverUrl, auth_username: authUsername },
    cachedRows,
  );
  const syncedRows = await getBooksByServerId(db, serverId);
  return { books: syncedRows, searchUrl };
}

export function useOPDSCatalog(
  serverId: string | undefined,
  serverUrl: string | undefined,
  authUsername = '',
) {
  const db = useSQLiteContext();
  const { books: cachedBooks, refresh: refreshCache, loading: cacheLoading } = useBooksCache(serverId);

  const query = useQuery({
    queryKey: ['opds-catalog', serverId, serverUrl, authUsername],
    queryFn: async () => {
      if (!serverId || !serverUrl) {
        return { books: [] as BookRow[], searchUrl: null };
      }
      return fetchAndCacheCatalog(db, serverId, serverUrl, authUsername);
    },
    enabled: Boolean(serverId && serverUrl),
    staleTime: 1000 * 60 * 10,
    retry: 1,
  });

  const refresh = useCallback(async () => {
    await query.refetch();
    await refreshCache();
  }, [query, refreshCache]);

  const refreshBooks = useCallback(async () => {
    if (!serverId || !serverUrl) return;
    const rows = await getBooksByServerId(db, serverId);
    await refreshCache();
    queryClient.setQueryData(
      ['opds-catalog', serverId, serverUrl, authUsername],
      (old: { books: BookRow[]; searchUrl: string | null } | undefined) =>
        old ? { ...old, books: rows } : { books: rows, searchUrl: null },
    );
  }, [authUsername, db, refreshCache, serverId, serverUrl]);

  const result: CatalogResult = useMemo(() => {
    const catalogBooks = query.data?.books;
    const searchUrl = query.data?.searchUrl ?? null;

    if (query.isSuccess && catalogBooks && catalogBooks.length > 0) {
      return {
        books: catalogBooks,
        isOffline: false,
        error: null,
        searchUrl,
      };
    }

    if (query.isError && cachedBooks.length > 0) {
      return {
        books: cachedBooks,
        isOffline: true,
        error: query.error instanceof Error ? query.error.message : 'Network error',
        searchUrl: null,
      };
    }

    if (query.isLoading && cachedBooks.length > 0) {
      return {
        books: cachedBooks,
        isOffline: false,
        error: null,
        searchUrl,
      };
    }

    return {
      books: catalogBooks ?? cachedBooks,
      isOffline: query.isError,
      error: query.isError
        ? query.error instanceof Error
          ? query.error.message
          : 'Failed to load catalog'
        : null,
      searchUrl,
    };
  }, [
    query.isSuccess,
    query.data,
    query.isError,
    query.error,
    query.isLoading,
    cachedBooks,
  ]);

  const isQueryEnabled = Boolean(serverId && serverUrl);

  return {
    ...result,
    isLoading: cacheLoading || (isQueryEnabled && query.isLoading && cachedBooks.length === 0),
    isRefetching: query.isRefetching,
    refresh,
    refreshBooks,
    error: result.error,
  };
}

export function useOPDSSearch(
  serverId: string | undefined,
  serverUrl: string | undefined,
  authUsername: string,
  searchUrl: string | null,
  query: string,
) {
  const trimmed = query.trim();

  return useQuery({
    queryKey: ['opds-search', serverId, trimmed],
    queryFn: async () => {
      if (!serverId || !serverUrl || !searchUrl || trimmed.length < 2) {
        return [] as BookRow[];
      }
      const auth = await getServerAuth(serverId, authUsername);
      const entries = await searchOPDSEntries(searchUrl, trimmed, serverUrl, auth);
      return entriesToBookRows(entries, serverId);
    },
    enabled: Boolean(serverId && serverUrl && searchUrl && trimmed.length >= 2),
    staleTime: 1000 * 60 * 2,
  });
}

export function parseBookCategories(book: BookRow): string[] {
  try {
    const parsed = JSON.parse(book.categories) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}
