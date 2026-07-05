import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  deleteServer,
  getAllServers,
  insertServer,
  updateServer,
} from '../queries';
import type { ServerRow } from '../schema';
import {
  deleteServerPassword,
  setServerPassword,
} from '@/services/opds/credentials';
import { testOpdsConnection } from '@/services/opds/connection';
import { deriveServerTitle, normalizeOpdsUrl } from '@/services/opds/url';
import i18n from '@/i18n';

export type ServerInput = {
  url: string;
  username: string;
  password: string;
};

export function useServers() {
  const db = useSQLiteContext();
  const [servers, setServers] = useState<ServerRow[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await getAllServers(db);
    setServers(rows);
    setLoading(false);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const addServer = useCallback(
    async (input: ServerInput): Promise<ServerRow> => {
      const normalizedUrl = normalizeOpdsUrl(input.url);
      const auth =
        input.username.trim() && input.password
          ? { username: input.username.trim(), password: input.password }
          : null;

      const connection = await testOpdsConnection(normalizedUrl, auth);
      if (!connection.ok) {
        throw new Error(i18n.t('errors.catalogConnectionFailed'));
      }

      const server: ServerRow = {
        id: `server-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: deriveServerTitle(normalizedUrl, connection.title),
        url: normalizedUrl,
        auth_username: input.username.trim(),
        created_at: Date.now(),
      };
      await insertServer(db, server);
      if (input.password) {
        await setServerPassword(server.id, input.password);
      }
      await refresh();
      return server;
    },
    [db, refresh],
  );

  const editServer = useCallback(
    async (id: string, input: ServerInput): Promise<void> => {
      const normalizedUrl = normalizeOpdsUrl(input.url);
      const auth =
        input.username.trim() && input.password
          ? { username: input.username.trim(), password: input.password }
          : null;

      const connection = await testOpdsConnection(normalizedUrl, auth);
      if (!connection.ok) {
        throw new Error(i18n.t('errors.catalogConnectionFailed'));
      }

      await updateServer(
        db,
        id,
        deriveServerTitle(normalizedUrl, connection.title),
        normalizedUrl,
        input.username.trim(),
      );
      if (input.password) {
        await setServerPassword(id, input.password);
      }
      await refresh();
    },
    [db, refresh],
  );

  const removeServer = useCallback(
    async (id: string) => {
      await deleteServer(db, id);
      await deleteServerPassword(id);
      await refresh();
    },
    [db, refresh],
  );

  return { servers, loading, refresh, addServer, editServer, removeServer };
}
