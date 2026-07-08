import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllDownloads, getServerById, getUserPreferences } from '@/db/queries';
import { syncCwaCatalogProgress } from '@/services/koreader/cwaProgress';
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

export async function syncDownloadedBooksProgress(
  db: SQLiteDatabase,
): Promise<LibrarySyncRefreshResult> {
  const active = await isSyncActive(db);
  if (!active) {
    return { pulled: 0, updated: 0, errors: 0 };
  }

  let pulled = 0;
  let updated = 0;
  let errors = 0;

  const prefs = await getUserPreferences(db);
  const server = prefs.active_server_id
    ? await getServerById(db, prefs.active_server_id)
    : null;

  if (server) {
    const cwa = await syncCwaCatalogProgress(db, server);
    pulled += cwa.checked;
    updated += cwa.updated;
    errors += cwa.errors;
  }

  const downloads = await getAllDownloads(db);
  const completed = downloads.filter((row) => row.status === 'completed');

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
