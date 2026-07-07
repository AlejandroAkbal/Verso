import { useMemo, useState } from 'react';

import type { BookRow } from '@/db/schema';
import { parseBookCategories } from '@/hooks/useOPDSCatalog';

export type LibraryFilter = 'all' | 'on-device';

const MAX_CATEGORY_CHIPS = 12;

function matchesSearch(book: BookRow, query: string): boolean {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;
  return (
    book.title.toLowerCase().includes(normalized) ||
    book.author.toLowerCase().includes(normalized)
  );
}

type UseLibraryFiltersArgs = {
  books: BookRow[];
  /** Remote OPDS search hits, when a query is active. */
  remoteSearchData: BookRow[] | undefined;
  /** Book ids that are downloaded (for the "Downloaded" filter). */
  downloadedIds: Set<string>;
  /**
   * Current search text. Owned by the screen because the OPDS search request
   * derives from it before this hook runs.
   */
  searchQuery: string;
};

/**
 * Owns the library's category / on-device filter state and derives the visible
 * book list from the catalog, remote search hits, and the active query. Kept
 * separate from the screen so browsing features (sorting, richer filters)
 * extend here without touching layout.
 */
export function useLibraryFilters({
  books,
  remoteSearchData,
  downloadedIds,
  searchQuery,
}: UseLibraryFiltersArgs) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const categoryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      for (const category of parseBookCategories(book)) {
        counts.set(category, (counts.get(category) ?? 0) + 1);
      }
    }
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, MAX_CATEGORY_CHIPS)
      .map(([name]) => name);
  }, [books]);

  const sourceBooks = useMemo(() => {
    const trimmed = searchQuery.trim();
    const candidates =
      trimmed.length >= 2 && remoteSearchData && remoteSearchData.length > 0
        ? remoteSearchData
        : books;
    return candidates.filter((book) => book.download_url.length > 0);
  }, [books, remoteSearchData, searchQuery]);

  const visibleBooks = useMemo(() => {
    let list = sourceBooks;

    if (filter === 'on-device') {
      list = list.filter((book) => downloadedIds.has(book.id));
    }

    if (categoryFilter) {
      list = list.filter((book) =>
        parseBookCategories(book).includes(categoryFilter),
      );
    }

    const trimmed = searchQuery.trim();
    if (trimmed.length > 0 && trimmed.length < 2) {
      list = list.filter((book) => matchesSearch(book, trimmed));
    } else if (
      trimmed.length >= 2 &&
      (!remoteSearchData || remoteSearchData.length === 0)
    ) {
      list = list.filter((book) => matchesSearch(book, trimmed));
    }

    return list;
  }, [sourceBooks, filter, categoryFilter, downloadedIds, searchQuery, remoteSearchData]);

  const isFiltered = useMemo(
    () =>
      filter !== 'all' || categoryFilter != null || searchQuery.trim().length > 0,
    [filter, categoryFilter, searchQuery],
  );

  return {
    filter,
    setFilter,
    categoryFilter,
    setCategoryFilter,
    categoryOptions,
    visibleBooks,
    isFiltered,
  };
}
