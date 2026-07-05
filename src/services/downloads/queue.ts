import { Directory, File, Paths } from 'expo-file-system';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  getActiveDownloads,
  getBookById,
  updateDownloadStatus,
  upsertDownload,
} from '@/db/queries';
import type { DownloadRow } from '@/db/schema';

export const DOWNLOADS_DIR_NAME = 'books';

const MAX_CONCURRENT = 2;

export function getDownloadsDirectory(): Directory {
  return new Directory(Paths.document, DOWNLOADS_DIR_NAME);
}

export function ensureDownloadsDirectory(): void {
  const dir = getDownloadsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
  }
}

function getExtensionFromMime(mime: string, url: string): string {
  if (mime.includes('epub') || url.endsWith('.epub')) return '.epub';
  if (mime.includes('pdf') || url.endsWith('.pdf')) return '.pdf';
  if (mime.includes('text') || url.endsWith('.txt')) return '.txt';
  return '.epub';
}

export async function enqueueDownload(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  const book = await getBookById(db, bookId);
  if (!book || !book.download_url) {
    throw new Error('Book has no download URL');
  }

  const existing = await getActiveDownloads(db);
  const alreadyQueued = existing.some((d) => d.book_id === bookId);
  if (alreadyQueued) return;

  const download: DownloadRow = {
    book_id: bookId,
    status: 'queued',
    progress: 0,
    local_uri: '',
    bytes_total: 0,
    bytes_written: 0,
    error: '',
    updated_at: Date.now(),
  };

  await upsertDownload(db, download);
}

export async function processDownloadQueue(db: SQLiteDatabase): Promise<void> {
  ensureDownloadsDirectory();

  while (true) {
    const active = await getActiveDownloads(db);
    const downloading = active.filter((d) => d.status === 'downloading');

    if (downloading.length >= MAX_CONCURRENT) {
      return;
    }

    const next = active.find((d) => d.status === 'queued');
    if (!next) {
      return;
    }

    await downloadBook(db, next.book_id);
  }
}

async function downloadBook(db: SQLiteDatabase, bookId: string): Promise<void> {
  const book = await getBookById(db, bookId);
  if (!book || !book.download_url) {
    await updateDownloadStatus(db, bookId, 'failed', {
      error: 'Missing download URL',
    });
    return;
  }

  const ext = getExtensionFromMime(book.mime, book.download_url);
  const destFile = new File(getDownloadsDirectory(), `${bookId}${ext}`);

  if (destFile.exists) {
    destFile.delete();
  }

  await updateDownloadStatus(db, bookId, 'downloading', { progress: 0 });

  try {
    const task = File.createDownloadTask(book.download_url, destFile, {
      onProgress: ({ bytesWritten, totalBytes }) => {
        const progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        void updateDownloadStatus(db, bookId, 'downloading', {
          progress,
          bytes_total: totalBytes,
          bytes_written: bytesWritten,
        });
      },
    });

    const downloadResult = await task.downloadAsync();

    if (!downloadResult) {
      throw new Error('Download returned no file');
    }

    await updateDownloadStatus(db, bookId, 'completed', {
      progress: 1,
      local_uri: downloadResult.uri,
      bytes_total: downloadResult.size ?? 0,
      bytes_written: downloadResult.size ?? 0,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Download failed';
    await updateDownloadStatus(db, bookId, 'failed', { error: message });
  }
}

export async function cancelDownload(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  await updateDownloadStatus(db, bookId, 'cancelled');
}
