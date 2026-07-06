import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { useDownloads } from '@/db/hooks/useDownloads';
import { getBookById } from '@/db/queries';
import { formatDownloadError } from '@/lib/downloadErrors';
import { notificationErrorHaptic } from '@/lib/haptics';
import { showToast } from '@/lib/toast';

/** Surfaces new download failures as toasts (library grid has no inline error). */
export function DownloadFeedbackListener() {
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { downloads } = useDownloads();
  const seenStatus = useRef(new Map<string, string>());
  const initialized = useRef(false);

  useEffect(() => {
    void (async () => {
      for (const download of downloads) {
        const previous = seenStatus.current.get(download.book_id);
        seenStatus.current.set(download.book_id, download.status);

        if (!initialized.current) {
          continue;
        }

        if (download.status !== 'failed' || previous === 'failed' || !download.error) {
          continue;
        }

        const book = await getBookById(db, download.book_id);
        const reason = formatDownloadError(t, download.error);
        const title = book?.title?.trim() || t('downloads.errorFallbackTitle');

        void notificationErrorHaptic();
        showToast(t('downloads.failedToast', { title, reason }), 'error');
      }

      initialized.current = true;
    })();
  }, [db, downloads, t]);

  return null;
}
