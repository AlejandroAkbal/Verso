import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers, setOnboardingCompleted, setActiveServerId } from '@/db/queries';
import { removeAllDownloads } from '@/services/downloads/manage';
import { deleteServerPassword } from '@/services/opds/credentials';

export async function clearAllAppData(db: SQLiteDatabase): Promise<void> {
  const servers = await getAllServers(db);

  for (const server of servers) {
    await deleteServerPassword(server.id);
  }

  await removeAllDownloads(db);

  await db.execAsync(`
    DELETE FROM reading_progress;
    DELETE FROM downloads;
    DELETE FROM books;
    DELETE FROM servers;
  `);

  await setOnboardingCompleted(db, false);
  await setActiveServerId(db, '');
}
