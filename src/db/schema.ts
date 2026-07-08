export type ServerRow = {
  id: string;
  title: string;
  url: string;
  auth_username: string;
  created_at: number;
};

export type UserPreferencesRow = {
  id: number;
  onboarding_completed: number;
  active_server_id: string;
  koreader_sync_enabled: number;
  resume_last_book: number;
  last_open_book_id: string;
  library_sort: string;
  library_filter: string;
  library_category_filter: string;
};

export type DocumentIdMode = 'partial_md5' | 'filename';

export type SyncAccountRow = {
  id: string;
  server_url: string;
  username: string;
  document_id_mode: DocumentIdMode;
  device_id: string;
  enabled: number;
  created_at: number;
};

export type BookSyncStateRow = {
  book_id: string;
  document_id: string;
  document_id_mode: DocumentIdMode;
  last_pushed_at: number;
  last_pulled_at: number;
  remote_timestamp: number;
  remote_percentage: number | null;
  remote_progress: string;
  last_error: string;
};

export type BookRow = {
  id: string;
  server_id: string;
  opds_id: string;
  title: string;
  author: string;
  summary: string;
  cover_url: string;
  blurhash: string;
  download_url: string;
  mime: string;
  updated_at: string;
  cached_at: number;
  categories: string;
};

export type DownloadStatus =
  | 'queued'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled';

export type DownloadRow = {
  book_id: string;
  status: DownloadStatus;
  progress: number;
  local_uri: string;
  bytes_total: number;
  bytes_written: number;
  error: string;
  updated_at: number;
};

export type ReadingProgressRow = {
  book_id: string;
  progression: number;
  locator_json: string;
  updated_at: number;
};

export const SCHEMA_VERSION = 11;

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    active_server_id TEXT NOT NULL DEFAULT '',
    koreader_sync_enabled INTEGER NOT NULL DEFAULT 0,
    resume_last_book INTEGER NOT NULL DEFAULT 0,
    last_open_book_id TEXT NOT NULL DEFAULT '',
    library_sort TEXT NOT NULL DEFAULT 'recent',
    library_filter TEXT NOT NULL DEFAULT 'all',
    library_category_filter TEXT NOT NULL DEFAULT ''
  );

  CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    url TEXT NOT NULL UNIQUE,
    auth_username TEXT NOT NULL DEFAULT '',
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS books (
    id TEXT PRIMARY KEY NOT NULL,
    server_id TEXT NOT NULL,
    opds_id TEXT NOT NULL,
    title TEXT NOT NULL,
    author TEXT NOT NULL DEFAULT '',
    summary TEXT NOT NULL DEFAULT '',
    cover_url TEXT NOT NULL DEFAULT '',
    blurhash TEXT NOT NULL DEFAULT '',
    download_url TEXT NOT NULL DEFAULT '',
    mime TEXT NOT NULL DEFAULT '',
    updated_at TEXT NOT NULL DEFAULT '',
    cached_at INTEGER NOT NULL,
    categories TEXT NOT NULL DEFAULT '[]',
    FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
    UNIQUE(server_id, opds_id)
  );

  CREATE TABLE IF NOT EXISTS downloads (
    book_id TEXT PRIMARY KEY NOT NULL,
    status TEXT NOT NULL DEFAULT 'queued',
    progress REAL NOT NULL DEFAULT 0,
    local_uri TEXT NOT NULL DEFAULT '',
    bytes_total INTEGER NOT NULL DEFAULT 0,
    bytes_written INTEGER NOT NULL DEFAULT 0,
    error TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reading_progress (
    book_id TEXT PRIMARY KEY NOT NULL,
    progression REAL NOT NULL DEFAULT 0,
    locator_json TEXT NOT NULL DEFAULT '',
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_books_server_id ON books(server_id);
  CREATE INDEX IF NOT EXISTS idx_books_cached_at ON books(cached_at DESC);
  CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);

  CREATE TABLE IF NOT EXISTS sync_accounts (
    id TEXT PRIMARY KEY NOT NULL,
    server_url TEXT NOT NULL,
    username TEXT NOT NULL,
    document_id_mode TEXT NOT NULL DEFAULT 'partial_md5',
    device_id TEXT NOT NULL,
    enabled INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS book_sync_state (
    book_id TEXT PRIMARY KEY NOT NULL,
    document_id TEXT NOT NULL,
    document_id_mode TEXT NOT NULL,
    last_pushed_at INTEGER NOT NULL DEFAULT 0,
    last_pulled_at INTEGER NOT NULL DEFAULT 0,
    remote_timestamp INTEGER NOT NULL DEFAULT 0,
    remote_percentage REAL,
    remote_progress TEXT NOT NULL DEFAULT '',
    last_error TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );
`;
