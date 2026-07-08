import * as LegacyFS from 'expo-file-system/legacy';

import { md5Hex, Md5Hasher } from '../../lib/md5';
import type { DocumentIdMode } from '../../db/schema';

import { fileNameFromUri } from './fileName';

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

export function partialMd5Offsets(): number[] {
  const step = 1024;
  const offsets: number[] = [];
  for (let i = -1; i <= 10; i += 1) {
    offsets.push(step << (2 * i));
  }
  return offsets;
}

export async function partialMd5DocumentId(localUri: string): Promise<string> {
  const hasher = new Md5Hasher();
  const size = 1024;

  for (const offset of partialMd5Offsets()) {
    const base64 = await LegacyFS.readAsStringAsync(localUri, {
      encoding: LegacyFS.EncodingType.Base64,
      position: offset,
      length: size,
    });

    if (!base64) {
      break;
    }

    const chunk = base64ToBytes(base64);
    if (chunk.length === 0) {
      break;
    }

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
