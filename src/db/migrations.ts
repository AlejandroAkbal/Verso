import type { SQLiteDatabase } from 'expo-sqlite';

import {
  CREATE_TABLES_SQL,
  DEFAULT_OPDS_SERVERS,
  SCHEMA_VERSION,
} from './schema';

export async function migrateDatabase(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(CREATE_TABLES_SQL);

  const versionRow = await db.getFirstAsync<{ version: number }>(
    'SELECT version FROM schema_version LIMIT 1',
  );

  if (!versionRow) {
    await db.runAsync('INSERT INTO schema_version (version) VALUES (?)', [
      SCHEMA_VERSION,
    ]);
    await seedDefaultServers(db);
    return;
  }

  if (versionRow.version < SCHEMA_VERSION) {
    await db.runAsync('UPDATE schema_version SET version = ?', [SCHEMA_VERSION]);
  }
}

async function seedDefaultServers(db: SQLiteDatabase): Promise<void> {
  const existing = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM servers',
  );

  if (existing && existing.count > 0) {
    return;
  }

  const now = Date.now();
  for (const server of DEFAULT_OPDS_SERVERS) {
    const id = `server-${now}-${Math.random().toString(36).slice(2, 9)}`;
    await db.runAsync(
      'INSERT INTO servers (id, title, url, created_at) VALUES (?, ?, ?, ?)',
      [id, server.title, server.url, now],
    );
  }
}
