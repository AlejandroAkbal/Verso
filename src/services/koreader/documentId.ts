import { File } from 'expo-file-system';

import { md5Hex, Md5Hasher } from '@/lib/md5';
import type { DocumentIdMode } from '@/db/schema';

import { fileNameFromUri } from './fileName';

export async function partialMd5DocumentId(localUri: string): Promise<string> {
  const file = new File(localUri);
  if (!file.exists) {
    throw new Error('EPUB file not found for document ID');
  }

  const hasher = new Md5Hasher();
  const step = 1024;
  const size = 1024;

  for (let i = -1; i <= 10; i += 1) {
    const offset = step << (2 * i);
    const slice = file.slice(offset, offset + size);
    if (slice.size === 0) {
      break;
    }
    const chunk = new Uint8Array(await slice.arrayBuffer());
    hasher.update(chunk);
  }

  return hasher.digestHex();
}

export function filenameDocumentId(localUri: string): string {
  const basename = fileNameFromUri(localUri);
  return md5Hex(basename);
}

export async function computeDocumentId(
  localUri: string,
  mode: DocumentIdMode,
): Promise<string> {
  if (mode === 'filename') {
    return filenameDocumentId(localUri);
  }
  return partialMd5DocumentId(localUri);
}
