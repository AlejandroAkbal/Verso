import { File } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  deleteDownload,
  getAllDownloads,
  getDownloadByBookId,
} from '@/db/queries';
import type { DownloadRow } from '@/db/schema';

import { getDownloadsDirectory } from './queue';

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

function fileExists(localUri: string): boolean {
  if (!localUri) return false;

  try {
    return new File(localUri).exists;
  } catch {
    return false;
  }
}

function fileNameFromUri(localUri: string): string {
  const withoutQuery = localUri.split(/[?#]/)[0];
  const slashIndex = withoutQuery.lastIndexOf('/');
  const fileName =
    slashIndex >= 0 ? withoutQuery.slice(slashIndex + 1) : withoutQuery;

  try {
    return decodeURIComponent(fileName);
  } catch {
    return fileName;
  }
}

export function resolveDownloadLocalUri(download: DownloadRow): string {
  if (fileExists(download.local_uri)) {
    return download.local_uri;
  }

  const fileName = fileNameFromUri(download.local_uri);
  if (!fileName) {
    return download.local_uri;
  }

  try {
    const relocatedFile = new File(getDownloadsDirectory(), fileName);
    if (relocatedFile.exists) {
      return relocatedFile.uri;
    }
  } catch {
    // Keep the stored URI and let the caller surface the missing file state.
  }

  return download.local_uri;
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
}

export async function removeAllDownloads(db: SQLiteDatabase): Promise<number> {
  const downloads = await getAllDownloads(db);
  const completed = downloads.filter((d) => d.status === 'completed');

  for (const download of completed) {
    const resolvedLocalUri = resolveDownloadLocalUri(download);
    deleteLocalFile(download.local_uri);
    if (resolvedLocalUri !== download.local_uri) {
      deleteLocalFile(resolvedLocalUri);
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

  return completed.length;
}

export function isDownloadComplete(download: DownloadRow | null | undefined): boolean {
  return download?.status === 'completed' && Boolean(download.local_uri);
}
