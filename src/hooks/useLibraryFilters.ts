import { useMemo, useState, useEffect } from 'react';
import { useLibraryFilterContext } from '@/context/LibraryFilterContext';

import type { BookRow, ReadingProgressRow } from '@/db/schema';
import { parseBookCategories } from '@/hooks/useOPDSCatalog';

import { isFinished, progressPercent } from '@/lib/readingProgress';

export type LibraryFilter = 'all' | 'on-device';
export type LibrarySort = 'recent' | 'progress' | 'oldest';

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
  /** Reading progress by book ID for sorting. */
  progressByBookId?: Map<string, ReadingProgressRow>;
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
  progressByBookId = new Map(),
}: UseLibraryFiltersArgs) {
  const [filter, setFilter] = useState<LibraryFilter>('all');
  const { sort, categoryFilter, setCategoryOptions } = useLibraryFilterContext();

  const categoryOptionsLocal = useMemo(() => {
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

  useEffect(() => {
    setCategoryOptions(categoryOptionsLocal);
  }, [categoryOptionsLocal, setCategoryOptions]);

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

    list = [...list].sort((a, b) => {
      if (sort === 'progress') {
        const progA = progressByBookId.get(a.id);
        const progB = progressByBookId.get(b.id);
        const pA = progressPercent(progA) ?? 0;
        const pB = progressPercent(progB) ?? 0;
        const inProgA = pA > 0 && !isFinished(progA) ? 1 : 0;
        const inProgB = pB > 0 && !isFinished(progB) ? 1 : 0;
        
        if (inProgA !== inProgB) {
          return inProgB - inProgA;
        }
        
        if (inProgA === 1 && inProgB === 1) {
          const timeA = progA?.updated_at ?? 0;
          const timeB = progB?.updated_at ?? 0;
          if (timeA !== timeB) return timeB - timeA;
        }
      }
      
      const timeA = a.cached_at ?? 0;
      const timeB = b.cached_at ?? 0;
      
      if (sort === 'oldest') {
        return timeA - timeB;
      }
      
      return timeB - timeA;
    });

    return list;
  }, [sourceBooks, filter, categoryFilter, downloadedIds, searchQuery, remoteSearchData, sort, progressByBookId]);

  const isFiltered = useMemo(
    () =>
      filter !== 'all' || categoryFilter != null || searchQuery.trim().length > 0,
    [filter, categoryFilter, searchQuery],
  );

  return {
    filter,
    setFilter,
    categoryFilter,
    sort,
    visibleBooks,
    isFiltered,
  };
}
