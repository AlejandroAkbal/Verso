import { describe, expect, it, vi } from 'vitest';

import { syncCwaCatalogProgress } from './cwaProgress';

const mocks = vi.hoisted(() => ({
  fetchRemoteProgress: vi.fn(),
}));

vi.mock('@/db/queries', () => ({
  getBooksByServerId: vi.fn(),
  getBookSyncState: vi.fn(() => ({
    book_id: 'book-1',
    document_id: 'cached-document-id',
    document_id_mode: 'partial_md5',
    last_pushed_at: 0,
    last_pulled_at: 0,
    remote_timestamp: 1,
    remote_percentage: 0.1,
    remote_progress: '10%',
    last_error: '',
  })),
  getSyncAccount: vi.fn(() => ({
    id: 'default',
    server_url: 'https://sync.example.com',
    username: 'global-user',
    document_id_mode: 'partial_md5',
    device_id: 'device-1',
    enabled: 1,
    created_at: 1,
  })),
  upsertBookSyncState: vi.fn(),
}));

vi.mock('@/services/koreader/client', () => ({
  fetchRemoteProgress: mocks.fetchRemoteProgress,
}));

vi.mock('@/lib/md5', () => ({
  Md5Hasher: class {
    update() {}
    digestHex() {
      return 'hashed-document-id';
    }
  },
}));

vi.mock('@/services/koreader/documentId', () => ({
  partialMd5Offsets: () => [],
}));

vi.mock('@/services/koreader/credentials', () => ({
  getKoreaderPassword: vi.fn(() => 'global-password'),
}));

vi.mock('@/services/koreader/syncBook', () => ({
  applyRemotePercentage: vi.fn(),
  isSyncActive: vi.fn(() => true),
}));

vi.mock('@/services/opds/credentials', () => ({
  authToHeaders: vi.fn(() => ({ Authorization: 'Basic library' })),
  getServerAuth: vi.fn(() => ({ username: 'library-user', password: 'library-password' })),
}));

describe('syncCwaCatalogProgress', () => {
  it('uses the saved global sync account for remote progress instead of active library credentials', async () => {
    mocks.fetchRemoteProgress.mockResolvedValueOnce(null);

    await syncCwaCatalogProgress(
      {} as never,
      { id: 'server-1', url: 'https://library.example.com/opds', auth_username: 'library-user' },
      [
        {
          id: 'book-1',
          server_id: 'server-1',
          opds_id: 'opds-1',
          title: 'Book',
          author: '',
          summary: '',
          cover_url: '',
          blurhash: '',
          download_url: 'https://library.example.com/opds/download/1/epub/',
          mime: 'application/epub+zip',
          updated_at: '',
          cached_at: 1,
          categories: '[]',
        },
      ],
    );

    expect(mocks.fetchRemoteProgress).toHaveBeenCalledWith(
      'https://sync.example.com',
      'global-user',
      'cached-document-id',
      'global-password',
    );
  });
});
