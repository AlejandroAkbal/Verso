import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers, getSyncAccount, getUserPreferences, setKoreaderSyncEnabled } from '@/db/queries';
import { getServerPassword } from '@/services/opds/credentials';
import { deriveKosyncUrlFromOpdsUrl } from '@/services/opds/url';

import { testKoreaderConnection } from './client';
import { getKoreaderPassword } from './credentials';
import { saveDefaultSyncAccount } from './syncBook';

export async function verifyExistingOrActiveLibrarySync(db: SQLiteDatabase): Promise<boolean> {
  const account = await getSyncAccount(db);
  const password = await getKoreaderPassword();

  if (account?.server_url && account.username && password) {
    await testKoreaderConnection(account.server_url, account.username, password);
    await setKoreaderSyncEnabled(db, true);
    return true;
  }

  const [servers, prefs] = await Promise.all([getAllServers(db), getUserPreferences(db)]);
  const activeServer = servers.find((server) => server.id === prefs.active_server_id) ?? servers[0];
  if (!activeServer?.auth_username) {
    return false;
  }

  const serverPassword = await getServerPassword(activeServer.id);
  if (!serverPassword) {
    return false;
  }

  const serverUrl = deriveKosyncUrlFromOpdsUrl(activeServer.url);
  await testKoreaderConnection(serverUrl, activeServer.auth_username, serverPassword);
  await saveDefaultSyncAccount(db, {
    serverUrl,
    username: activeServer.auth_username,
    password: serverPassword,
    documentIdMode: 'partial_md5',
    enabled: true,
  });
  return true;
}
