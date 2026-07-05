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
  position: number;
  total: number;
  font_size: number;
  updated_at: number;
};

export const SCHEMA_VERSION = 7;

export const CREATE_TABLES_SQL = `
  PRAGMA journal_mode = WAL;
  PRAGMA busy_timeout = 5000;

  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS user_preferences (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    onboarding_completed INTEGER NOT NULL DEFAULT 0,
    active_server_id TEXT NOT NULL DEFAULT ''
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
    position INTEGER NOT NULL DEFAULT 0,
    total INTEGER NOT NULL DEFAULT 0,
    font_size INTEGER NOT NULL DEFAULT 18,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_books_server_id ON books(server_id);
  CREATE INDEX IF NOT EXISTS idx_books_cached_at ON books(cached_at DESC);
  CREATE INDEX IF NOT EXISTS idx_downloads_status ON downloads(status);
`;
