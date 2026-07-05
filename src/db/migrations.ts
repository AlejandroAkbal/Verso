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
      try {
        await db.runAsync(
          `ALTER TABLE servers ADD COLUMN auth_username TEXT NOT NULL DEFAULT ''`,
        );
      } catch {
        // Column may already exist on fresh installs.
      }

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
      try {
        await db.runAsync(
          `ALTER TABLE books ADD COLUMN categories TEXT NOT NULL DEFAULT '[]'`,
        );
      } catch {
        // Column may already exist on fresh installs.
      }
    }

    if (versionRow.version < 6) {
      // cached_at is first-seen time; existing rows were stamped on every sync.
      await db.runAsync('UPDATE books SET cached_at = 0');
    }

    if (versionRow.version < 7) {
      try {
        await db.runAsync(
          `ALTER TABLE user_preferences ADD COLUMN active_server_id TEXT NOT NULL DEFAULT ''`,
        );
      } catch {
        // Column may already exist on fresh installs.
      }
    }

    await db.runAsync('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }

  await db.runAsync(
    'INSERT OR IGNORE INTO user_preferences (id, onboarding_completed) VALUES (1, 0)',
  );

  await ensureDefaultPublicServers(db);
}
