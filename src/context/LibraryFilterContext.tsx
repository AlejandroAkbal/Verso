import React, { createContext, useCallback, useContext, useEffect, useState, ReactNode } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getUserPreferences, setLibraryFilterPreferences } from '@/db/queries';
import type { LibraryFilter, LibrarySort } from '@/hooks/useLibraryFilters';

function normalizeSort(value: string): LibrarySort {
  return value === 'progress' || value === 'oldest' ? value : 'recent';
}

function normalizeFilter(value: string): LibraryFilter {
  return value === 'on-device' ? value : 'all';
}

type LibraryFilterContextType = {
  filter: LibraryFilter;
  setFilter: (filter: LibraryFilter) => void;
  sort: LibrarySort;
  setSort: (sort: LibrarySort) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  categoryOptions: string[];
  setCategoryOptions: (options: string[]) => void;
};

const LibraryFilterContext = createContext<LibraryFilterContextType | null>(null);

export function LibraryFilterProvider({ children }: { children: ReactNode }) {
  const db = useSQLiteContext();
  const [filter, setFilterState] = useState<LibraryFilter>('all');
  const [sort, setSortState] = useState<LibrarySort>('recent');
  const [categoryFilter, setCategoryFilterState] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  const persist = useCallback((nextSort: LibrarySort, nextFilter: LibraryFilter, nextCategory: string | null) => {
    void setLibraryFilterPreferences(db, nextSort, nextFilter, nextCategory ?? '');
  }, [db]);

  const setSort = useCallback((next: LibrarySort) => {
    setSortState(next);
    persist(next, filter, categoryFilter);
  }, [categoryFilter, filter, persist]);

  const setFilter = useCallback((next: LibraryFilter) => {
    setFilterState(next);
    persist(sort, next, categoryFilter);
  }, [categoryFilter, persist, sort]);

  const setCategoryFilter = useCallback((next: string | null) => {
    setCategoryFilterState(next);
    persist(sort, filter, next);
  }, [filter, persist, sort]);

  useEffect(() => {
    let mounted = true;
    void getUserPreferences(db).then((prefs) => {
      if (!mounted) return;
      setSortState(normalizeSort(prefs.library_sort));
      setFilterState(normalizeFilter(prefs.library_filter));
      setCategoryFilterState(prefs.library_category_filter || null);
    });
    return () => {
      mounted = false;
    };
  }, [db]);

  return (
    <LibraryFilterContext.Provider
      value={{
        filter,
        setFilter,
        sort,
        setSort,
        categoryFilter,
        setCategoryFilter,
        categoryOptions,
        setCategoryOptions,
      }}
    >
      {children}
    </LibraryFilterContext.Provider>
  );
}

export function useLibraryFilterContext() {
  const context = useContext(LibraryFilterContext);
  if (!context) {
    throw new Error('useLibraryFilterContext must be used within a LibraryFilterProvider');
  }
  return context;
}
