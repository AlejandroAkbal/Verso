import { useCallback, useEffect, useState } from 'react';

import {
  DEFAULT_READER_PREFERENCES,
  loadReaderPreferences,
  saveReaderPreferences,
  type StoredReaderPreferences,
} from '@/services/reader/preferences';

export function useReaderPreferences() {
  const [prefs, setPrefs] = useState<StoredReaderPreferences>(DEFAULT_READER_PREFERENCES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    queueMicrotask(() => {
      void loadReaderPreferences().then((loaded) => {
        setPrefs(loaded);
        setLoading(false);
      });
    });
  }, []);

  const updatePrefs = useCallback(
    async (patch: Partial<StoredReaderPreferences>) => {
      setPrefs((current) => {
        const next = { ...current, ...patch };
        void saveReaderPreferences(next);
        return next;
      });
    },
    [],
  );

  return { prefs, loading, updatePrefs };
}
