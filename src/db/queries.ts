import type { SQLiteDatabase } from 'expo-sqlite';

import type {
  BookRow,
  BookSyncStateRow,
  DownloadRow,
  DownloadStatus,
  ReadingProgressRow,
  ServerRow,
  SyncAccountRow,
  UserPreferencesRow,
} from './schema';

const SERVER_COLUMNS = 'id, title, url, auth_username, created_at';

const BOOK_COLUMNS = `id, server_id, opds_id, title, author, summary,
  cover_url, blurhash, download_url, mime, updated_at, cached_at, categories`;

export async function getAllServers(db: SQLiteDatabase): Promise<ServerRow[]> {
  return db.getAllAsync<ServerRow>(
    `SELECT ${SERVER_COLUMNS} FROM servers ORDER BY created_at ASC`,
  );
}

export async function getServerById(
  db: SQLiteDatabase,
  id: string,
): Promise<ServerRow | null> {
  return db.getFirstAsync<ServerRow>(
    `SELECT ${SERVER_COLUMNS} FROM servers WHERE id = ?`,
    [id],
  );
}

export async function insertServer(
  db: SQLiteDatabase,
  server: ServerRow,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO servers (id, title, url, auth_username, created_at)
     VALUES (?, ?, ?, ?, ?)`,
    [server.id, server.title, server.url, server.auth_username, server.created_at],
  );
}

export async function updateServer(
  db: SQLiteDatabase,
  id: string,
  title: string,
  url: string,
  authUsername: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE servers SET title = ?, url = ?, auth_username = ? WHERE id = ?',
    [title, url, authUsername, id],
  );
}

export async function deleteServer(db: SQLiteDatabase, id: string): Promise<void> {
  await db.runAsync('DELETE FROM servers WHERE id = ?', [id]);
}

export async function getUserPreferences(
  db: SQLiteDatabase,
): Promise<UserPreferencesRow> {
  const row = await db.getFirstAsync<UserPreferencesRow>(
    `SELECT id, onboarding_completed, active_server_id, koreader_sync_enabled,
      resume_last_book, last_open_book_id
     FROM user_preferences WHERE id = 1`,
  );

  return (
    row ?? {
      id: 1,
      onboarding_completed: 0,
      active_server_id: '',
      koreader_sync_enabled: 0,
      resume_last_book: 0,
      last_open_book_id: '',
    }
  );
}

export async function setActiveServerId(
  db: SQLiteDatabase,
  serverId: string,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences (id, onboarding_completed, active_server_id)
     VALUES (1, 0, '')`,
  );
  await db.runAsync(
    'UPDATE user_preferences SET active_server_id = ? WHERE id = 1',
    [serverId],
  );
}

export async function setOnboardingCompleted(
  db: SQLiteDatabase,
  completed: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO user_preferences (id, onboarding_completed) VALUES (1, ?)
     ON CONFLICT(id) DO UPDATE SET onboarding_completed = excluded.onboarding_completed`,
    [completed ? 1 : 0],
  );
}

export async function upsertBooks(
  db: SQLiteDatabase,
  books: BookRow[],
): Promise<void> {
  await db.withTransactionAsync(async () => {
    for (const book of books) {
      await db.runAsync(
        `INSERT INTO books (
          id, server_id, opds_id, title, author, summary,
          cover_url, blurhash, download_url, mime, updated_at, cached_at, categories
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
          title = excluded.title,
          author = excluded.author,
          summary = excluded.summary,
          cover_url = excluded.cover_url,
          blurhash = excluded.blurhash,
          download_url = excluded.download_url,
          mime = excluded.mime,
          updated_at = excluded.updated_at,
          categories = excluded.categories`,
        [
          book.id,
          book.server_id,
          book.opds_id,
          book.title,
          book.author,
          book.summary,
          book.cover_url,
          book.blurhash,
          book.download_url,
          book.mime,
          book.updated_at,
          book.cached_at,
          book.categories,
        ],
      );
    }
  });
}

export async function getBooksByServerId(
  db: SQLiteDatabase,
  serverId: string,
): Promise<BookRow[]> {
  return db.getAllAsync<BookRow>(
    `SELECT ${BOOK_COLUMNS} FROM books WHERE server_id = ? ORDER BY title ASC`,
    [serverId],
  );
}

export async function getBookCountByServerId(
  db: SQLiteDatabase,
  serverId: string,
): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) AS count FROM books WHERE server_id = ?',
    [serverId],
  );
  return row?.count ?? 0;
}

export async function getAllCachedBooks(db: SQLiteDatabase): Promise<BookRow[]> {
  return db.getAllAsync<BookRow>(
    `SELECT ${BOOK_COLUMNS} FROM books ORDER BY cached_at DESC`,
  );
}

export async function getBookById(
  db: SQLiteDatabase,
  id: string,
): Promise<BookRow | null> {
  return db.getFirstAsync<BookRow>(
    `SELECT ${BOOK_COLUMNS} FROM books WHERE id = ?`,
    [id],
  );
}

/** Clears the NEW badge by zeroing first-seen timestamp. */
export async function acknowledgeBook(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE books SET cached_at = 0 WHERE id = ? AND cached_at > 0',
    [bookId],
  );
}

export async function updateBookDownloadUrl(
  db: SQLiteDatabase,
  bookId: string,
  downloadUrl: string,
  mime: string,
): Promise<void> {
  await db.runAsync(
    'UPDATE books SET download_url = ?, mime = ? WHERE id = ?',
    [downloadUrl, mime, bookId],
  );
}

export async function upsertDownload(
  db: SQLiteDatabase,
  download: DownloadRow,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO downloads (
      book_id, status, progress, local_uri, bytes_total, bytes_written, error, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(book_id) DO UPDATE SET
      status = excluded.status,
      progress = excluded.progress,
      local_uri = excluded.local_uri,
      bytes_total = excluded.bytes_total,
      bytes_written = excluded.bytes_written,
      error = excluded.error,
      updated_at = excluded.updated_at`,
    [
      download.book_id,
      download.status,
      download.progress,
      download.local_uri,
      download.bytes_total,
      download.bytes_written,
      download.error,
      download.updated_at,
    ],
  );
}

export async function getDownloadByBookId(
  db: SQLiteDatabase,
  bookId: string,
): Promise<DownloadRow | null> {
  return db.getFirstAsync<DownloadRow>(
    `SELECT book_id, status, progress, local_uri, bytes_total, bytes_written, error, updated_at
     FROM downloads WHERE book_id = ?`,
    [bookId],
  );
}

export async function getAllDownloads(db: SQLiteDatabase): Promise<DownloadRow[]> {
  return db.getAllAsync<DownloadRow>(
    `SELECT book_id, status, progress, local_uri, bytes_total, bytes_written, error, updated_at
     FROM downloads ORDER BY updated_at DESC`,
  );
}

export async function getActiveDownloads(db: SQLiteDatabase): Promise<DownloadRow[]> {
  return db.getAllAsync<DownloadRow>(
    `SELECT book_id, status, progress, local_uri, bytes_total, bytes_written, error, updated_at
     FROM downloads WHERE status IN ('queued', 'downloading')
     ORDER BY updated_at ASC`,
  );
}

export async function deleteDownload(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  await db.runAsync('DELETE FROM downloads WHERE book_id = ?', [bookId]);
}

export async function getCompletedDownloads(
  db: SQLiteDatabase,
): Promise<DownloadRow[]> {
  return db.getAllAsync<DownloadRow>(
    `SELECT book_id, status, progress, local_uri, bytes_total, bytes_written, error, updated_at
     FROM downloads WHERE status = 'completed'
     ORDER BY updated_at DESC`,
  );
}

export async function updateDownloadStatus(
  db: SQLiteDatabase,
  bookId: string,
  status: DownloadStatus,
  fields: Partial<Omit<DownloadRow, 'book_id' | 'status'>> = {},
): Promise<void> {
  const progress = fields.progress ?? 0;
  const localUri = fields.local_uri ?? '';
  const bytesTotal = fields.bytes_total ?? 0;
  const bytesWritten = fields.bytes_written ?? 0;
  const error = fields.error ?? '';

  await db.runAsync(
    `UPDATE downloads SET status = ?, progress = ?, local_uri = ?, bytes_total = ?,
     bytes_written = ?, error = ?, updated_at = ? WHERE book_id = ?`,
    [status, progress, localUri, bytesTotal, bytesWritten, error, Date.now(), bookId],
  );
}

export async function upsertReadingProgress(
  db: SQLiteDatabase,
  progress: ReadingProgressRow,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO reading_progress (book_id, progression, locator_json, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(book_id) DO UPDATE SET
       progression = excluded.progression,
       locator_json = excluded.locator_json,
       updated_at = excluded.updated_at`,
    [
      progress.book_id,
      progress.progression,
      progress.locator_json,
      progress.updated_at,
    ],
  );
}

export async function getReadingProgress(
  db: SQLiteDatabase,
  bookId: string,
): Promise<ReadingProgressRow | null> {
  return db.getFirstAsync<ReadingProgressRow>(
    'SELECT book_id, progression, locator_json, updated_at FROM reading_progress WHERE book_id = ?',
    [bookId],
  );
}

export async function getAllReadingProgress(
  db: SQLiteDatabase,
): Promise<ReadingProgressRow[]> {
  return db.getAllAsync<ReadingProgressRow>(
    'SELECT book_id, progression, locator_json, updated_at FROM reading_progress',
  );
}

export const DEFAULT_SYNC_ACCOUNT_ID = 'default';

export async function getSyncAccount(
  db: SQLiteDatabase,
  id = DEFAULT_SYNC_ACCOUNT_ID,
): Promise<SyncAccountRow | null> {
  return db.getFirstAsync<SyncAccountRow>(
    `SELECT id, server_url, username, document_id_mode, device_id, enabled, created_at
     FROM sync_accounts WHERE id = ?`,
    [id],
  );
}

export async function upsertSyncAccount(
  db: SQLiteDatabase,
  account: SyncAccountRow,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO sync_accounts (
      id, server_url, username, document_id_mode, device_id, enabled, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      server_url = excluded.server_url,
      username = excluded.username,
      document_id_mode = excluded.document_id_mode,
      device_id = excluded.device_id,
      enabled = excluded.enabled`,
    [
      account.id,
      account.server_url,
      account.username,
      account.document_id_mode,
      account.device_id,
      account.enabled,
      account.created_at,
    ],
  );
}

export async function setKoreaderSyncEnabled(
  db: SQLiteDatabase,
  enabled: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)`,
  );
  await db.runAsync(
    'UPDATE user_preferences SET koreader_sync_enabled = ? WHERE id = 1',
    [enabled ? 1 : 0],
  );
}

export async function setResumeLastBook(
  db: SQLiteDatabase,
  enabled: boolean,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)`,
  );
  await db.runAsync(
    'UPDATE user_preferences SET resume_last_book = ? WHERE id = 1',
    [enabled ? 1 : 0],
  );
}

export async function setLastOpenBookId(
  db: SQLiteDatabase,
  bookId: string,
): Promise<void> {
  await db.runAsync(
    `INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)`,
  );
  await db.runAsync('UPDATE user_preferences SET last_open_book_id = ? WHERE id = 1', [
    bookId,
  ]);
}

export async function getBookSyncState(
  db: SQLiteDatabase,
  bookId: string,
): Promise<BookSyncStateRow | null> {
  return db.getFirstAsync<BookSyncStateRow>(
    `SELECT book_id, document_id, document_id_mode, last_pushed_at, last_pulled_at,
      remote_timestamp, remote_percentage, remote_progress, last_error
     FROM book_sync_state WHERE book_id = ?`,
    [bookId],
  );
}

export async function upsertBookSyncState(
  db: SQLiteDatabase,
  state: BookSyncStateRow,
): Promise<void> {
  await db.runAsync(
    `INSERT INTO book_sync_state (
      book_id, document_id, document_id_mode, last_pushed_at, last_pulled_at,
      remote_timestamp, remote_percentage, remote_progress, last_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(book_id) DO UPDATE SET
      document_id = excluded.document_id,
      document_id_mode = excluded.document_id_mode,
      last_pushed_at = excluded.last_pushed_at,
      last_pulled_at = excluded.last_pulled_at,
      remote_timestamp = excluded.remote_timestamp,
      remote_percentage = excluded.remote_percentage,
      remote_progress = excluded.remote_progress,
      last_error = excluded.last_error`,
    [
      state.book_id,
      state.document_id,
      state.document_id_mode,
      state.last_pushed_at,
      state.last_pulled_at,
      state.remote_timestamp,
      state.remote_percentage,
      state.remote_progress,
      state.last_error,
    ],
  );
}
