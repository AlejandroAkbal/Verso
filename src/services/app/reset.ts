import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers } from '@/db/queries';
import { removeAllDownloads } from '@/services/downloads/manage';
import { deleteKoreaderPassword } from '@/services/koreader/credentials';
import { deleteKoreaderDeviceId } from '@/services/koreader/deviceId';
import { deleteServerPassword } from '@/services/opds/credentials';
import { deleteReaderPreferences } from '@/services/reader/preferences';

export async function clearAllAppData(db: SQLiteDatabase): Promise<void> {
  const servers = await getAllServers(db);

  for (const server of servers) {
    await deleteServerPassword(server.id);
  }

  await Promise.all([
    deleteKoreaderPassword(),
    deleteKoreaderDeviceId(),
    deleteReaderPreferences(),
  ]);
  await removeAllDownloads(db);

  await db.execAsync(`
    DELETE FROM reading_progress;
    DELETE FROM book_sync_state;
    DELETE FROM downloads;
    DELETE FROM books;
    DELETE FROM servers;
    DELETE FROM sync_accounts;
    DELETE FROM user_preferences;
    INSERT INTO user_preferences (
      id,
      onboarding_completed,
      active_server_id,
      koreader_sync_enabled,
      resume_last_book,
      last_open_book_id,
      library_sort,
      library_filter,
      library_category_filter
    ) VALUES (1, 0, '', 0, 0, '', 'recent', 'all', '');
  `);
}
