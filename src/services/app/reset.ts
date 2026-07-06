import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers, setActiveServerId, setOnboardingCompleted } from '@/db/queries';
import { removeAllDownloads } from '@/services/downloads/manage';
import { deleteServerPassword } from '@/services/opds/credentials';
import { deleteKoreaderPassword } from '@/services/koreader/credentials';

export async function clearAllAppData(db: SQLiteDatabase): Promise<void> {
  const servers = await getAllServers(db);

  for (const server of servers) {
    await deleteServerPassword(server.id);
  }

  await deleteKoreaderPassword();
  await removeAllDownloads(db);

  await db.execAsync(`
    DELETE FROM reading_progress;
    DELETE FROM book_sync_state;
    DELETE FROM downloads;
    DELETE FROM books;
    DELETE FROM servers;
    DELETE FROM sync_accounts;
  `);

  await setOnboardingCompleted(db, false);
  await setActiveServerId(db, '');
  await db.runAsync(
    `UPDATE user_preferences SET koreader_sync_enabled = 0, resume_last_book = 0, last_open_book_id = '' WHERE id = 1`,
  );
}
