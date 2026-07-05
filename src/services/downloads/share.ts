import { File } from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export function formatLabelFromMime(mime: string): string {
  if (mime.includes('epub')) return 'EPUB';
  if (mime.includes('text') || mime.includes('plain')) return 'TXT';
  if (mime.includes('pdf')) return 'PDF';
  const subtype = mime.split('/')[1];
  return subtype ? subtype.toUpperCase() : 'FILE';
}

export async function shareDownloadedBookFile(
  localUri: string,
  options: { title: string; mime: string },
): Promise<void> {
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('File not found');
  }

  const canShare = await Sharing.isAvailableAsync();
  if (!canShare) {
    throw new Error('Sharing not available');
  }

  await Sharing.shareAsync(localUri, {
    mimeType: options.mime || 'application/octet-stream',
    dialogTitle: options.title,
    UTI: options.mime,
  });
}
