import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllDownloads } from '@/db/queries';
import {
  applyRemotePercentage,
  isSyncActive,
  pullRemoteProgressForBook,
} from '@/services/koreader/syncBook';

export type LibrarySyncRefreshResult = {
  pulled: number;
  updated: number;
  errors: number;
};

/** Pull KOReader/CWA progress for every downloaded book (manual refresh). */
export async function syncDownloadedBooksProgress(
  db: SQLiteDatabase,
): Promise<LibrarySyncRefreshResult> {
  const active = await isSyncActive(db);
  if (!active) {
    return { pulled: 0, updated: 0, errors: 0 };
  }

  const downloads = await getAllDownloads(db);
  const completed = downloads.filter((row) => row.status === 'completed');

  let pulled = 0;
  let updated = 0;
  let errors = 0;

  for (const download of completed) {
    try {
      const result = await pullRemoteProgressForBook(db, download.book_id);
      if (result.error) {
        errors += 1;
        continue;
      }
      if (result.remote) {
        pulled += 1;
        await applyRemotePercentage(db, download.book_id, result.remote.percentage);
        updated += 1;
      }
    } catch {
      errors += 1;
    }
  }

  return { pulled, updated, errors };
}
