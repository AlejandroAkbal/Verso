import { useCallback, useEffect, useRef } from 'react';
import type { Locator } from 'react-native-readium';
import { useSQLiteContext } from 'expo-sqlite';

import { upsertReadingProgress } from '@/db/queries';
import { progressionFromLocator } from '@/lib/readingProgress';
import { pushLocalProgressForBook } from '@/services/koreader/syncBook';

const PROGRESS_SAVE_MS = 800;

/**
 * Debounced reading-progress persistence: writes the Readium locator to SQLite
 * and pushes to KOReader. Flushes immediately on unmount / back so nothing is
 * lost when leaving the reader.
 */
export function useReaderProgress(
  id: string | undefined,
  onProgression: (progression: number) => void,
) {
  const db = useSQLiteContext();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingLocator = useRef<Locator | null>(null);
  const pendingProgression = useRef(0);
  const positionCountRef = useRef<number | undefined>(undefined);

  const flushProgress = useCallback(async () => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    if (!id || !pendingLocator.current) return;

    const locator = pendingLocator.current;
    pendingLocator.current = null;

    await upsertReadingProgress(db, {
      book_id: id,
      progression: pendingProgression.current,
      locator_json: JSON.stringify(locator),
      updated_at: Date.now(),
    });
    await pushLocalProgressForBook(db, id, {
      force: true,
      positionCount: positionCountRef.current,
    });
  }, [db, id]);

  const persistProgress = useCallback(
    (locator: Locator) => {
      if (!id) return;

      const nextProgression = progressionFromLocator(locator);
      onProgression(nextProgression);
      pendingLocator.current = locator;
      pendingProgression.current = nextProgression;

      if (saveTimer.current) {
        clearTimeout(saveTimer.current);
      }

      saveTimer.current = setTimeout(() => {
        saveTimer.current = null;
        void flushProgress();
        void pushLocalProgressForBook(db, id, {
          positionCount: positionCountRef.current,
        });
      }, PROGRESS_SAVE_MS);
    },
    [db, flushProgress, id, onProgression],
  );

  useEffect(() => {
    return () => {
      void flushProgress();
    };
  }, [flushProgress]);

  const setPositionCount = useCallback((count: number) => {
    positionCountRef.current = count;
  }, []);

  return { persistProgress, flushProgress, setPositionCount };
}
