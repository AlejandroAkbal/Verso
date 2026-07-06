import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { promptSyncConflict } from '@/lib/syncPrompt';
import {
  applyRemotePercentage,
  pullRemoteProgressForBook,
} from '@/services/koreader/syncBook';

export function useOpenReaderWithSync(bookId: string | undefined) {
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const openingRef = useRef(false);
  const [isOpening, setIsOpening] = useState(false);

  const openReader = useCallback(async () => {
    if (!bookId || openingRef.current) {
      return;
    }

    openingRef.current = true;
    setIsOpening(true);

    const navigate = () => {
      router.push(`/reader/${bookId}`);
    };

    try {
      const pull = await pullRemoteProgressForBook(db, bookId);

      if (pull.hasConflict && pull.remote) {
        promptSyncConflict(
          t,
          () => {
            void applyRemotePercentage(db, bookId, pull.remote!.percentage).then(navigate);
          },
          navigate,
        );
        return;
      }

      navigate();
    } finally {
      setTimeout(() => {
        openingRef.current = false;
        setIsOpening(false);
      }, 1200);
    }
  }, [bookId, db, router, t]);

  return { openReader, isOpening };
}
