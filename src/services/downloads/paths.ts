import { Directory, File, Paths } from 'expo-file-system';

import type { DownloadRow } from '@/db/schema';

/**
 * Dependency-free download path/file primitives. Kept separate from `queue` and
 * `manage` so those modules (and `koreader/syncBook`) share these helpers
 * through a leaf instead of importing each other — which previously formed a
 * queue → syncBook → manage → queue require cycle.
 */

export const DOWNLOADS_DIR_NAME = 'books';

/** Downloads live under `<documents>/books`. */
export function getDownloadsDirectory(): Directory {
  return new Directory(Paths.document, DOWNLOADS_DIR_NAME);
}

export function ensureDownloadsDirectory(): void {
  const dir = getDownloadsDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true });
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

/**
 * Resolve a stored download URI against the CURRENT documents directory. iOS
 * app-container UUIDs can change between launches, so a persisted absolute URI
 * may be stale — relocate by file name when the original path is missing.
 */
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
