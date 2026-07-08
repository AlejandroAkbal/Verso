import { useRouter } from 'expo-router';
import { useCallback, useRef, useState } from 'react';

export function useOpenReaderWithSync(bookId: string | undefined) {
  const router = useRouter();
  const openingRef = useRef(false);
  const [isOpening, setIsOpening] = useState(false);

  const openReader = useCallback(async () => {
    if (!bookId || openingRef.current) {
      return;
    }

    openingRef.current = true;
    setIsOpening(true);

    router.push(`/reader/${bookId}`);

    setTimeout(() => {
      openingRef.current = false;
      setIsOpening(false);
    }, 1200);
  }, [bookId, router]);

  return { openReader, isOpening };
}
