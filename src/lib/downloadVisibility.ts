import type { DownloadRow } from '@/db/schema';
import { isDownloadComplete } from '@/services/downloads/manage';
import { isBookDownloadSessionActive } from '@/services/downloads/presentationSession';

export function isDownloadPending(download: DownloadRow | null | undefined): boolean {
  return (
    download?.status === 'queued' ||
    download?.status === 'downloading' ||
    download?.status === 'failed'
  );
}

/** Whether the grid should mount the cloud / progress control on a cover. */
export function shouldShowGridDownloadControl(
  bookId: string,
  isDownloaded: boolean,
  download: DownloadRow | null | undefined,
): boolean {
  if (!isDownloaded) {
    return true;
  }
  if (isDownloadPending(download)) {
    return true;
  }
  if (isBookDownloadSessionActive(bookId)) {
    return true;
  }
  return false;
}

export function resolveOnDevice(
  isDownloaded: boolean | undefined,
  download: DownloadRow | null | undefined,
): boolean {
  if (isDownloaded !== undefined) {
    return isDownloaded;
  }
  return isDownloadComplete(download);
}
