import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllServers, getUserPreferences, setKoreaderSyncEnabled, upsertBooks } from '@/db/queries';
import {
  chooseSyncAccountSource,
  getActiveLibrarySyncSetupCandidate,
  getSavedSyncAccountCandidate,
} from '@/services/koreader/account';
import { syncCwaCatalogProgress } from '@/services/koreader/cwaProgress';
import { getServerAuth, getServerPassword } from '@/services/opds/credentials';
import { resolveBookListingUrl } from '@/services/opds/catalog';
import { entriesToBookRows, fetchAllOPDSEntries } from '@/services/opds/parser';

import { testKoreaderConnection } from './client';
import { getKoreaderPassword } from './credentials';
import { saveDefaultSyncAccount } from './syncBook';

const ONBOARDING_CATALOG_MAX_PAGES = 50;

export async function syncActiveLibraryCatalogProgress(db: SQLiteDatabase): Promise<void> {
  const [servers, prefs] = await Promise.all([getAllServers(db), getUserPreferences(db)]);
  const activeServer = servers.find((server) => server.id === prefs.active_server_id) ?? servers[0];
  if (!activeServer) {
    return;
  }

  const auth = await getServerAuth(activeServer.id, activeServer.auth_username);
  const listingUrl = await resolveBookListingUrl(activeServer.url, auth);
  const { entries } = await fetchAllOPDSEntries(
    listingUrl,
    ONBOARDING_CATALOG_MAX_PAGES,
    auth,
  );
  const rows = await entriesToBookRows(entries, activeServer.id);
  await upsertBooks(db, rows.map((book) => ({ ...book, cached_at: 0 })));
  await syncCwaCatalogProgress(db, activeServer, rows);
}

export async function verifyExistingOrActiveLibrarySync(db: SQLiteDatabase): Promise<boolean> {
  const saved = await getSavedSyncAccountCandidate(db);
  const setupShortcut = await getActiveLibrarySyncSetupCandidate(db);
  const source = chooseSyncAccountSource(saved, setupShortcut);

  if (!source) return false;

  const password =
    source.kind === 'saved'
      ? await getKoreaderPassword()
      : setupShortcut?.serverId
        ? await getServerPassword(setupShortcut.serverId)
        : null;
  if (!password) return false;

  await testKoreaderConnection(source.serverUrl, source.username, password);

  if (source.kind === 'setup-shortcut') {
    await saveDefaultSyncAccount(db, {
      serverUrl: source.serverUrl,
      username: source.username,
      password,
      documentIdMode: 'partial_md5',
      enabled: true,
    });
  }
  await setKoreaderSyncEnabled(db, true);
  return true;
}
