import { Directory, File, Paths } from 'expo-file-system';
import * as LegacyFS from 'expo-file-system/legacy';
import type { SQLiteDatabase } from 'expo-sqlite';

import {
  acknowledgeBook,
  getActiveDownloads,
  getBookById,
  getDownloadByBookId,
  getServerById,
  updateBookDownloadUrl,
  updateDownloadStatus,
  upsertDownload,
} from '@/db/queries';
import type { BookRow, DownloadRow } from '@/db/schema';
import { authToHeaders, getServerAuth } from '@/services/opds/credentials';
import {
  isOpdsCatalogReference,
  resolveAcquisitionFromDetail,
} from '@/services/opds/parser';
import { ensureBookDocumentId } from '@/services/koreader/syncBook';

export const DOWNLOADS_DIR_NAME = 'books';

const MAX_CONCURRENT = 2;
const PROGRESS_WRITE_MS = 400;

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

async function removeExistingFile(uri: string): Promise<void> {
  const info = await LegacyFS.getInfoAsync(uri);
  if (info.exists) {
    await LegacyFS.deleteAsync(uri, { idempotent: true });
  }
}

async function fileSize(uri: string): Promise<number> {
  const info = await LegacyFS.getInfoAsync(uri);
  if (info.exists && 'size' in info && typeof info.size === 'number') {
    return info.size;
  }
  return 0;
}

export async function enqueueDownload(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  const book = await getBookById(db, bookId);
  if (!book || !book.download_url) {
    throw new Error('Book has no download URL');
  }

  const existing = await getDownloadByBookId(db, bookId);
  if (existing?.status === 'completed') {
    return;
  }

  const active = await getActiveDownloads(db);
  const alreadyQueued = active.some((d) => d.book_id === bookId);
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
  await acknowledgeBook(db, bookId);
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

async function resolveDownloadTarget(
  db: SQLiteDatabase,
  book: BookRow,
  auth: Awaited<ReturnType<typeof getServerAuth>>,
): Promise<{ url: string; mime: string }> {
  if (!isOpdsCatalogReference(book.download_url, book.mime)) {
    return { url: book.download_url, mime: book.mime };
  }

  const resolved = await resolveAcquisitionFromDetail(book.download_url, auth);
  await updateBookDownloadUrl(db, book.id, resolved.url, resolved.mime);
  return resolved;
}

async function downloadBook(db: SQLiteDatabase, bookId: string): Promise<void> {
  const book = await getBookById(db, bookId);
  if (!book || !book.download_url) {
    await updateDownloadStatus(db, bookId, 'failed', {
      error: 'Missing download URL',
    });
    return;
  }

  const server = await getServerById(db, book.server_id);
  const auth = server
    ? await getServerAuth(server.id, server.auth_username)
    : null;

  let downloadUrl = book.download_url;
  let downloadMime = book.mime;

  try {
    const resolved = await resolveDownloadTarget(db, book, auth);
    downloadUrl = resolved.url;
    downloadMime = resolved.mime;
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to resolve download URL';
    await updateDownloadStatus(db, bookId, 'failed', { error: message });
    return;
  }

  const ext = getExtensionFromMime(downloadMime, downloadUrl);
  const destFile = new File(getDownloadsDirectory(), `${bookId}${ext}`);

  // Legacy delete avoids File.delete(); reads use legacy getInfo — not Blob APIs.
  await removeExistingFile(destFile.uri);

  await updateDownloadStatus(db, bookId, 'downloading', { progress: 0 });

  const downloadHeaders = authToHeaders(auth);
  let lastProgressWrite = 0;

  try {
    const task = File.createDownloadTask(downloadUrl, destFile, {
      headers: downloadHeaders,
      sessionType: 'background',
      onProgress: ({ bytesWritten, totalBytes }) => {
        const now = Date.now();
        if (now - lastProgressWrite < PROGRESS_WRITE_MS) {
          return;
        }
        lastProgressWrite = now;
        const progress = totalBytes > 0 ? bytesWritten / totalBytes : 0;
        void updateDownloadStatus(db, bookId, 'downloading', {
          progress,
          bytes_total: totalBytes > 0 ? totalBytes : 0,
          bytes_written: bytesWritten,
        });
      },
    });

    const downloadResult = await task.downloadAsync();

    if (!downloadResult) {
      throw new Error('Download cancelled');
    }

    const size = await fileSize(downloadResult.uri);

    await updateDownloadStatus(db, bookId, 'completed', {
      progress: 1,
      local_uri: downloadResult.uri,
      bytes_total: size,
      bytes_written: size,
      error: '',
    });

    try {
      await ensureBookDocumentId(db, bookId);
    } catch {
      // KOReader document ID is best-effort; never fail a completed download for sync setup.
    }
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
