import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_PUBLIC_SERVERS } from '@/config/defaultServers';
import { getAllServers, insertServer } from '@/db/queries';
import { normalizeOpdsUrl } from '@/services/opds/url';

/** Insert bundled public catalogs when missing (idempotent by stable id + URL). */
export async function ensureDefaultPublicServers(db: SQLiteDatabase): Promise<void> {
  const existing = await getAllServers(db);
  const urls = new Set(existing.map((server) => normalizeOpdsUrl(server.url)));
  const ids = new Set(existing.map((server) => server.id));
  const now = Date.now();

  for (const seed of DEFAULT_PUBLIC_SERVERS) {
    const url = normalizeOpdsUrl(seed.url);
    if (urls.has(url) || ids.has(seed.id)) {
      continue;
    }

    await insertServer(db, {
      id: seed.id,
      title: seed.title,
      url,
      auth_username: '',
      created_at: now,
    });
    urls.add(url);
  }
}
