import type { SQLiteDatabase } from 'expo-sqlite';

import { CREATE_TABLES_SQL, SCHEMA_VERSION } from './schema';
import { ensureDefaultPublicServers } from './seedServers';

let migrationLock: Promise<void> | null = null;

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  if (migrationLock) {
    await migrationLock;
    return;
  }

  migrationLock = runMigrations(db);

  try {
    await migrationLock;
  } finally {
    migrationLock = null;
  }
}

async function tableColumnNames(db: SQLiteDatabase, table: string): Promise<Set<string>> {
  const columns = await db.getAllAsync<{ name: string }>(`PRAGMA table_info(${table})`);
  return new Set(columns.map((column) => column.name));
}

async function addColumnIfMissing(
  db: SQLiteDatabase,
  table: string,
  column: string,
  definition: string,
): Promise<void> {
  const names = await tableColumnNames(db, table);
  if (!names.has(column)) {
    await db.runAsync(`ALTER TABLE ${table} ADD COLUMN ${definition}`);
  }
}

async function ensureLibraryPreferenceColumns(db: SQLiteDatabase): Promise<void> {
  await addColumnIfMissing(
    db,
    'user_preferences',
    'library_sort',
    `library_sort TEXT NOT NULL DEFAULT 'recent'`,
  );
  await addColumnIfMissing(
    db,
    'user_preferences',
    'library_filter',
    `library_filter TEXT NOT NULL DEFAULT 'all'`,
  );
  await addColumnIfMissing(
    db,
    'user_preferences',
    'library_category_filter',
    `library_category_filter TEXT NOT NULL DEFAULT ''`,
  );
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  await db.execAsync('PRAGMA busy_timeout = 5000');
  await db.execAsync(CREATE_TABLES_SQL);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1',
  );

  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [
      SCHEMA_VERSION,
    ]);
    await db.runAsync(
      'INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)',
    );
    await ensureDefaultPublicServers(db);
    return;
  }

  if (versionRow.version < SCHEMA_VERSION) {
    if (versionRow.version < 2) {
      await db.runAsync(
        `UPDATE servers SET url = ? WHERE url IN (?, ?)`,
        [
          'https://www.gutenberg.org/ebooks/search.opds/?sort_order=downloads',
          'https://m.gutenberg.org/ebooks.opds/',
          'https://www.gutenberg.org/ebooks.opds/',
        ],
      );
      await db.runAsync(
        `UPDATE servers SET title = ?, url = ? WHERE url = ?`,
        [
          'Project Gutenberg (Latest)',
          'https://www.gutenberg.org/ebooks/search.opds/?sort_order=release_date',
          'https://standardebooks.org/feeds/opds',
        ],
      );
    }

    if (versionRow.version < 3) {
      await db.runAsync(
        `UPDATE servers SET url = REPLACE(url, 'https://m.gutenberg.org/', 'https://www.gutenberg.org/') WHERE url LIKE 'https://m.gutenberg.org/%'`,
      );
    }

    if (versionRow.version < 4) {
      await addColumnIfMissing(
        db,
        'servers',
        'auth_username',
        `auth_username TEXT NOT NULL DEFAULT ''`,
      );

      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_preferences (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          onboarding_completed INTEGER NOT NULL DEFAULT 0
        );
      `);

      await db.runAsync(
        'INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 1)',
      );
    }

    if (versionRow.version < 5) {
      await addColumnIfMissing(
        db,
        'books',
        'categories',
        `categories TEXT NOT NULL DEFAULT '[]'`,
      );
    }

    if (versionRow.version < 6) {
      // cached_at is first-seen time; existing rows were stamped on every sync.
      await db.runAsync('UPDATE books SET cached_at = 0');
    }

    if (versionRow.version < 7) {
      await addColumnIfMissing(
        db,
        'user_preferences',
        'active_server_id',
        `active_server_id TEXT NOT NULL DEFAULT ''`,
      );
    }

    if (versionRow.version < 8) {
      await db.execAsync(`
        DROP TABLE IF EXISTS reading_progress;
        CREATE TABLE reading_progress (
          book_id TEXT PRIMARY KEY NOT NULL,
          progression REAL NOT NULL DEFAULT 0,
          locator_json TEXT NOT NULL DEFAULT '',
          updated_at INTEGER NOT NULL,
          FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
        );
      `);
    }

    if (versionRow.version < 9) {
      // Existing catalogs are the user's baseline library, not new arrivals.
      await db.runAsync('UPDATE books SET cached_at = 0');
    }

    if (versionRow.version < 10) {
      await addColumnIfMissing(
        db,
        'user_preferences',
        'koreader_sync_enabled',
        `koreader_sync_enabled INTEGER NOT NULL DEFAULT 0`,
      );
      await addColumnIfMissing(
        db,
        'user_preferences',
        'resume_last_book',
        `resume_last_book INTEGER NOT NULL DEFAULT 0`,
      );
      await addColumnIfMissing(
        db,
        'user_preferences',
        'last_open_book_id',
        `last_open_book_id TEXT NOT NULL DEFAULT ''`,
      );

      await db.execAsync(`
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
      `);
    }

    if (versionRow.version < 11) {
      await ensureLibraryPreferenceColumns(db);
    }

    await db.runAsync('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }

  await ensureLibraryPreferenceColumns(db);

  await db.runAsync(
    'INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)',
  );

  await ensureDefaultPublicServers(db);
}
