import { describe, expect, it, vi } from 'vitest';

import { md5Hex } from '../../lib/md5';
import { computeDocumentId, filenameDocumentId, partialMd5Offsets } from './documentId';

vi.mock('expo-file-system/legacy', () => ({
  EncodingType: { Base64: 'base64' },
  readAsStringAsync: vi.fn(),
}));

describe('KOReader document IDs', () => {
  it('hashes the decoded basename in filename mode', () => {
    expect(filenameDocumentId('file:///Books/My%20Book.epub')).toBe(md5Hex('My Book.epub'));
  });

  it('delegates computeDocumentId filename mode to filenameDocumentId', async () => {
    const uri = 'file:///Books/My%20Book.epub';

    await expect(computeDocumentId(uri, 'filename')).resolves.toBe(filenameDocumentId(uri));
  });

  it('keeps partial-MD5 offsets stable', () => {
    expect(partialMd5Offsets()).toEqual([
      0,
      1024,
      4096,
      16384,
      65536,
      262144,
      1048576,
      4194304,
      16777216,
      67108864,
      268435456,
      1073741824,
    ]);
  });
});
