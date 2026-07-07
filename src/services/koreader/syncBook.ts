import type { SQLiteDatabase } from 'expo-sqlite';

import { appIdentity } from '@/config/appIdentity';
import {
  DEFAULT_SYNC_ACCOUNT_ID,
  getBookSyncState,
  getDownloadByBookId,
  getReadingProgress,
  getSyncAccount,
  getUserPreferences,
  setKoreaderSyncEnabled,
  upsertBookSyncState,
  upsertReadingProgress,
  upsertSyncAccount,
} from '@/db/queries';
import type { DocumentIdMode } from '@/db/schema';
import { resolveDownloadLocalUri } from '@/services/downloads/paths';
import { showSyncErrorToast } from '@/lib/toast';

import { setKoreaderPassword } from './credentials';
import {
  fetchRemoteProgress,
  hasSyncConflict,
  percentageToLocator,
  progressionToProgressString,
  pushRemoteProgress,
} from './client';
import { computeDocumentId } from './documentId';
import { getOrCreateKoreaderDeviceId } from './deviceId';
import { resolveKosyncProfile } from './profile';
import {
  CONFLICT_PROGRESS_DELTA,
  KOREADER_ACCEPT,
  MIN_PUSH_INTERVAL_MS,
  type KoreaderProgressResponse,
} from './types';

export type SyncPullResult = {
  remote: KoreaderProgressResponse | null;
  hasConflict: boolean;
  documentId: string | null;
  error?: string;
};

export async function isSyncActive(db: SQLiteDatabase): Promise<boolean> {
  const prefs = await getUserPreferences(db);
  if (prefs.koreader_sync_enabled !== 1) {
    return false;
  }

  const account = await getSyncAccount(db);
  return Boolean(account?.enabled && account.username && account.server_url);
}

async function getActiveAccount(db: SQLiteDatabase) {
  const account = await getSyncAccount(db);
  if (!account?.enabled || !account.username || !account.server_url) {
    return null;
  }
  return account;
}

export async function ensureBookDocumentId(
  db: SQLiteDatabase,
  bookId: string,
): Promise<string | null> {
  const account = await getActiveAccount(db);
  if (!account) {
    return null;
  }

  const download = await getDownloadByBookId(db, bookId);
  if (!download?.local_uri) {
    return null;
  }

  const localUri = resolveDownloadLocalUri(download);
  const mode = account.document_id_mode;
  const existing = await getBookSyncState(db, bookId);

  if (existing && existing.document_id && existing.document_id_mode === mode) {
    return existing.document_id;
  }

  const documentId = await computeDocumentId(localUri, mode);

  await upsertBookSyncState(db, {
    book_id: bookId,
    document_id: documentId,
    document_id_mode: mode,
    last_pushed_at: existing?.last_pushed_at ?? 0,
    last_pulled_at: existing?.last_pulled_at ?? 0,
    remote_timestamp: existing?.remote_timestamp ?? 0,
    remote_percentage: existing?.remote_percentage ?? null,
    remote_progress: existing?.remote_progress ?? '',
    last_error: '',
  });

  return documentId;
}

export async function pullRemoteProgressForBook(
  db: SQLiteDatabase,
  bookId: string,
): Promise<SyncPullResult> {
  const account = await getActiveAccount(db);
  if (!account) {
    return { remote: null, hasConflict: false, documentId: null };
  }

  const documentId = await ensureBookDocumentId(db, bookId);
  if (!documentId) {
    return { remote: null, hasConflict: false, documentId: null };
  }

  try {
    const remote = await fetchRemoteProgress(
      account.server_url,
      account.username,
      documentId,
    );
    const local = await getReadingProgress(db, bookId);
    const localProgression = local?.progression ?? 0;
    const localUpdatedAt = local?.updated_at ?? 0;

    const hasConflict = remote
      ? hasSyncConflict(localUpdatedAt, localProgression, remote)
      : false;

    const existing = await getBookSyncState(db, bookId);
    await upsertBookSyncState(db, {
      book_id: bookId,
      document_id: documentId,
      document_id_mode: account.document_id_mode,
      last_pushed_at: existing?.last_pushed_at ?? 0,
      last_pulled_at: Date.now(),
      remote_timestamp: remote?.timestamp ?? existing?.remote_timestamp ?? 0,
      remote_percentage: remote?.percentage ?? existing?.remote_percentage ?? null,
      remote_progress: remote?.progress ?? existing?.remote_progress ?? '',
      last_error: '',
    });

    return { remote, hasConflict, documentId };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync pull failed';
    const existing = await getBookSyncState(db, bookId);
    if (existing) {
      await upsertBookSyncState(db, { ...existing, last_error: message });
    }
    showSyncErrorToast(message);
    return { remote: null, hasConflict: false, documentId, error: message };
  }
}

export async function applyRemotePercentage(
  db: SQLiteDatabase,
  bookId: string,
  percentage: number,
): Promise<void> {
  const locator = percentageToLocator(percentage);
  await upsertReadingProgress(db, {
    book_id: bookId,
    progression: percentage,
    locator_json: JSON.stringify(locator),
    updated_at: Date.now(),
  });
}

export async function pushLocalProgressForBook(
  db: SQLiteDatabase,
  bookId: string,
  options: { force?: boolean; positionCount?: number } = {},
): Promise<void> {
  const account = await getActiveAccount(db);
  if (!account) {
    return;
  }

  const documentId = await ensureBookDocumentId(db, bookId);
  if (!documentId) {
    return;
  }

  const local = await getReadingProgress(db, bookId);
  const progression = local?.progression ?? 0;
  const syncState = await getBookSyncState(db, bookId);
  const now = Date.now();

  if (
    !options.force &&
    syncState &&
    now - syncState.last_pushed_at < MIN_PUSH_INTERVAL_MS
  ) {
    return;
  }

  const deviceId = account.device_id || (await getOrCreateKoreaderDeviceId());

  try {
    const response = await pushRemoteProgress(
      account.server_url,
      account.username,
      {
        progress: progressionToProgressString(progression, options.positionCount),
        percentage: Math.min(1, Math.max(0, progression)),
        device_id: deviceId,
        document: documentId,
        device: appIdentity.displayName,
      },
    );

    await upsertBookSyncState(db, {
      book_id: bookId,
      document_id: documentId,
      document_id_mode: account.document_id_mode,
      last_pushed_at: now,
      last_pulled_at: syncState?.last_pulled_at ?? 0,
      remote_timestamp: response.timestamp,
      remote_percentage: response.percentage,
      remote_progress: response.progress,
      last_error: '',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Sync push failed';
    if (syncState) {
      await upsertBookSyncState(db, { ...syncState, last_error: message });
    }
    showSyncErrorToast(message);
  }
}

export async function saveDefaultSyncAccount(
  db: SQLiteDatabase,
  input: {
    serverUrl: string;
    username: string;
    password: string;
    documentIdMode: DocumentIdMode;
    enabled: boolean;
  },
): Promise<void> {
  await setKoreaderPassword(input.password);

  const deviceId = await getOrCreateKoreaderDeviceId();
  const existing = await getSyncAccount(db);

  await upsertSyncAccount(db, {
    id: DEFAULT_SYNC_ACCOUNT_ID,
    server_url: resolveKosyncProfile(input.serverUrl).baseUrl,
    username: input.username.trim(),
    document_id_mode: input.documentIdMode,
    device_id: deviceId,
    enabled: input.enabled ? 1 : 0,
    created_at: existing?.created_at ?? Date.now(),
  });

  await setKoreaderSyncEnabled(db, input.enabled);
}

export { KOREADER_ACCEPT, CONFLICT_PROGRESS_DELTA };
