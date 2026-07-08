import type { SQLiteDatabase } from 'expo-sqlite';

export type SavedSyncAccountCandidate = {
  serverUrl: string;
  username: string;
  hasPassword: boolean;
};

export type SyncSetupCandidate = {
  serverUrl: string;
  username: string;
  hasPassword: boolean;
  serverId?: string;
};

export type SyncAccountCandidate = SavedSyncAccountCandidate | SyncSetupCandidate;

export type ChosenSyncAccountSource = {
  kind: 'saved' | 'setup-shortcut';
  serverUrl: string;
  username: string;
};

export function chooseSyncAccountSource(
  saved: SavedSyncAccountCandidate | null,
  setupShortcut: SyncSetupCandidate | null,
): ChosenSyncAccountSource | null {
  if (saved?.serverUrl && saved.username) {
    return saved.hasPassword ? { kind: 'saved', serverUrl: saved.serverUrl, username: saved.username } : null;
  }

  if (setupShortcut?.serverUrl && setupShortcut.username && setupShortcut.hasPassword) {
    return {
      kind: 'setup-shortcut',
      serverUrl: setupShortcut.serverUrl,
      username: setupShortcut.username,
    };
  }

  return null;
}

export async function getSavedSyncAccountCandidate(
  db: SQLiteDatabase,
): Promise<SavedSyncAccountCandidate | null> {
  const [{ getSyncAccount }, { getKoreaderPassword }] = await Promise.all([
    import('@/db/queries'),
    import('@/services/koreader/credentials'),
  ]);
  const account = await getSyncAccount(db);
  if (!account?.server_url || !account.username) return null;

  const password = await getKoreaderPassword();
  return {
    serverUrl: account.server_url,
    username: account.username,
    hasPassword: Boolean(password),
  };
}

export async function getActiveLibrarySyncSetupCandidate(
  db: SQLiteDatabase,
): Promise<SyncSetupCandidate | null> {
  const [{ getAllServers, getUserPreferences }, { getServerPassword }, { deriveKosyncUrlFromOpdsUrl }] =
    await Promise.all([
      import('@/db/queries'),
      import('@/services/opds/credentials'),
      import('@/services/opds/url'),
    ]);
  const [servers, prefs] = await Promise.all([getAllServers(db), getUserPreferences(db)]);
  const activeServer = servers.find((server) => server.id === prefs.active_server_id) ?? servers[0];
  if (!activeServer?.auth_username) return null;

  const password = await getServerPassword(activeServer.id);
  return {
    serverUrl: deriveKosyncUrlFromOpdsUrl(activeServer.url),
    username: activeServer.auth_username,
    hasPassword: Boolean(password),
    serverId: activeServer.id,
  };
}
