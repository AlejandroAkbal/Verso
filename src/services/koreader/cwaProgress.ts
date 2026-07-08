import type { SQLiteDatabase } from 'expo-sqlite';

import { getBooksByServerId, getBookSyncState, upsertBookSyncState } from '@/db/queries';
import type { BookRow } from '@/db/schema';
import { Md5Hasher } from '@/lib/md5';
import { fetchRemoteProgress } from '@/services/koreader/client';
import { applyRemotePercentage, isSyncActive } from '@/services/koreader/syncBook';
import { authToHeaders, getServerAuth } from '@/services/opds/credentials';
import { deriveKosyncUrlFromOpdsUrl } from '@/services/opds/url';

const CWA_BOOK_ID_PATTERN = /\/opds\/download\/(\d+)\//;
const MAX_CONCURRENT = 8;
const CHUNK_SIZE = 1024;
const EMPTY_PROGRESS_RECHECK_MS = 10 * 60 * 1000;

type CwaSyncServer = {
  id: string;
  url: string;
  auth_username: string;
};

export type CwaCatalogProgressResult = {
  checked: number;
  updated: number;
  errors: number;
};

function isCwaBook(book: BookRow): boolean {
  return CWA_BOOK_ID_PATTERN.test(book.download_url);
}

async function fetchRangeChunk(
  url: string,
  headers: Record<string, string>,
  offset: number,
): Promise<Uint8Array | null> {
  const response = await fetch(url, {
    headers: {
      ...headers,
      Range: `bytes=${offset}-${offset + CHUNK_SIZE - 1}`,
    },
  });

  if (response.status === 416) {
    return null;
  }
  if (response.status !== 206) {
    throw new Error(`Range fetch failed (${response.status})`);
  }

  const chunk = new Uint8Array(await response.arrayBuffer());
  return chunk.length > 0 ? chunk : null;
}

async function partialMd5DocumentIdFromHttp(
  url: string,
  headers: Record<string, string>,
): Promise<string> {
  const hasher = new Md5Hasher();

  for (let i = -1; i <= 10; i += 1) {
    const offset = CHUNK_SIZE << (2 * i);
    const chunk = await fetchRangeChunk(url, headers, offset);
    if (!chunk) {
      break;
    }
    hasher.update(chunk);
  }

  return hasher.digestHex();
}

async function runPool<T>(items: T[], worker: (item: T) => Promise<void>): Promise<void> {
  let index = 0;
  const workers = Array.from(
    { length: Math.min(MAX_CONCURRENT, items.length) },
    async () => {
      while (index < items.length) {
        const item = items[index];
        index += 1;
        await worker(item);
      }
    },
  );

  await Promise.all(workers);
}

export async function syncCwaCatalogProgress(
  db: SQLiteDatabase,
  server: CwaSyncServer,
  books?: BookRow[],
): Promise<CwaCatalogProgressResult> {
  if (!(await isSyncActive(db))) {
    return { checked: 0, updated: 0, errors: 0 };
  }

  const auth = await getServerAuth(server.id, server.auth_username);
  if (!auth) {
    return { checked: 0, updated: 0, errors: 0 };
  }

  const baseUrl = deriveKosyncUrlFromOpdsUrl(server.url);
  const headers = authToHeaders(auth);
  const rows = books ?? await getBooksByServerId(db, server.id);
  const candidates = rows.filter((book) => isCwaBook(book));

  let checked = 0;
  let updated = 0;
  let errors = 0;

  await runPool(candidates, async (book) => {
    try {
      const cached = await getBookSyncState(db, book.id);
      if (
        cached?.document_id &&
        cached.remote_timestamp === 0 &&
        Date.now() - cached.last_pulled_at < EMPTY_PROGRESS_RECHECK_MS
      ) {
        return;
      }
      const documentId = cached?.document_id || await partialMd5DocumentIdFromHttp(book.download_url, headers);
      const remote = await fetchRemoteProgress(baseUrl, auth.username, documentId, auth.password);
      checked += 1;
      if (remote) {
        await upsertBookSyncState(db, {
          book_id: book.id,
          document_id: documentId,
          document_id_mode: 'partial_md5',
          last_pushed_at: cached?.last_pushed_at ?? 0,
          last_pulled_at: Date.now(),
          remote_timestamp: remote.timestamp,
          remote_percentage: remote.percentage,
          remote_progress: remote.progress,
          last_error: '',
        });
        if (remote.percentage > 0) {
          await applyRemotePercentage(db, book.id, remote.percentage);
          updated += 1;
        }
      } else if (!cached?.document_id) {
        await upsertBookSyncState(db, {
          book_id: book.id,
          document_id: documentId,
          document_id_mode: 'partial_md5',
          last_pushed_at: 0,
          last_pulled_at: Date.now(),
          remote_timestamp: 0,
          remote_percentage: null,
          remote_progress: '',
          last_error: '',
        });
      }
    } catch {
      errors += 1;
    }
  });

  return { checked, updated, errors };
}
