import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getUserPreferences, setOnboardingCompleted } from '../queries';

export function useOnboarding() {
  const db = useSQLiteContext();
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const prefs = await getUserPreferences(db);
    setCompleted(prefs.onboarding_completed === 1);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const completeOnboarding = useCallback(async () => {
    await setOnboardingCompleted(db, true);
    setCompleted(true);
  }, [db]);

  return { completed, loading, completeOnboarding, refresh };
}
