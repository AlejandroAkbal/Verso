import { createContext, useContext } from 'react';
import type { Link, ReadiumViewRef } from 'react-native-readium';
import type { StoredReaderPreferences } from '@/services/reader/preferences';

export type ReaderContextType = {
  readiumRef: React.RefObject<ReadiumViewRef | null>;
  tableOfContents: Link[];
  setTableOfContents: (toc: Link[]) => void;
  prefs: StoredReaderPreferences;
  updatePrefs: (patch: Partial<StoredReaderPreferences>) => Promise<void>;
  handleTocSelect: (link: Link) => void;
};

export const ReaderContext = createContext<ReaderContextType | null>(null);

export function useReaderContext() {
  const context = useContext(ReaderContext);
  if (!context) {
    throw new Error('useReaderContext must be used within a ReaderProvider');
  }
  return context;
}
