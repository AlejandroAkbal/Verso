import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteDownload,
  getAllDownloads,
  getDownloadByBookId,
} from '@/db/queries';
import type { DownloadRow } from '@/db/schema';

import { notifyDownloadsChanged } from '@/services/downloads/changes';
import { clearAllDownloadSessions, clearBookDownloadSession } from '@/services/downloads/presentationSession';

import { getDownloadsDirectory, resolveDownloadLocalUri } from './paths';

export type DownloadStorageStats = {
  count: number;
  bytes: number;
};

export function formatStorageSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export async function getDownloadStorageStats(
  db: SQLiteDatabase,
): Promise<DownloadStorageStats> {
  const downloads = await getAllDownloads(db);
  const completed = downloads.filter((d) => d.status === 'completed');

  let bytes = 0;
  for (const download of completed) {
    bytes += download.bytes_total || download.bytes_written || 0;
  }

  return { count: completed.length, bytes };
}

function deleteLocalFile(localUri: string): void {
  if (!localUri) return;

  try {
    const file = new File(localUri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // File may already be gone.
  }
}

export async function removeDownloadedBook(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  const download = await getDownloadByBookId(db, bookId);
  if (!download) return;

  const resolvedLocalUri = resolveDownloadLocalUri(download);
  deleteLocalFile(download.local_uri);
  if (resolvedLocalUri !== download.local_uri) {
    deleteLocalFile(resolvedLocalUri);
  }
  await deleteDownload(db, bookId);
  clearBookDownloadSession(bookId);
  notifyDownloadsChanged();
}

export async function removeAllDownloads(db: SQLiteDatabase): Promise<number> {
  const downloads = await getAllDownloads(db);

  for (const download of downloads) {
    if (download.local_uri) {
      const resolvedLocalUri = resolveDownloadLocalUri(download);
      deleteLocalFile(download.local_uri);
      if (resolvedLocalUri !== download.local_uri) {
        deleteLocalFile(resolvedLocalUri);
      }
    }
    await deleteDownload(db, download.book_id);
  }

  const dir = getDownloadsDirectory();
  if (dir.exists) {
    try {
      dir.delete();
    } catch {
      // Best effort cleanup.
    }
  }

  clearAllDownloadSessions();
  notifyDownloadsChanged();

  return downloads.length;
}

export function isDownloadComplete(download: DownloadRow | null | undefined): boolean {
  return download?.status === 'completed' && Boolean(download.local_uri);
}
