import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { LibrarySort } from '@/hooks/useLibraryFilters';

type LibraryFilterContextType = {
  sort: LibrarySort;
  setSort: (sort: LibrarySort) => void;
  categoryFilter: string | null;
  setCategoryFilter: (category: string | null) => void;
  categoryOptions: string[];
  setCategoryOptions: (options: string[]) => void;
};

const LibraryFilterContext = createContext<LibraryFilterContextType | null>(null);

export function LibraryFilterProvider({ children }: { children: ReactNode }) {
  const [sort, setSort] = useState<LibrarySort>('recent');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>([]);

  return (
    <LibraryFilterContext.Provider
      value={{
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
