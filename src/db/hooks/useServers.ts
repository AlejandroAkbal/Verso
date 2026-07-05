import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import {
  deleteServer,
  getAllServers,
  insertServer,
  updateServer,
} from '../queries';
import type { ServerRow } from '../schema';

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
    void refresh();
  }, [refresh]);

  const addServer = useCallback(
    async (title: string, url: string) => {
      const normalizedUrl = url.trim().replace(/\/+$/, '') + '/';
      const server: ServerRow = {
        id: `server-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        title: title.trim(),
        url: normalizedUrl,
        created_at: Date.now(),
      };
      await insertServer(db, server);
      await refresh();
      return server;
    },
    [db, refresh],
  );

  const editServer = useCallback(
    async (id: string, title: string, url: string) => {
      const normalizedUrl = url.trim().replace(/\/+$/, '') + '/';
      await updateServer(db, id, title.trim(), normalizedUrl);
      await refresh();
    },
    [db, refresh],
  );

  const removeServer = useCallback(
    async (id: string) => {
      await deleteServer(db, id);
      await refresh();
    },
    [db, refresh],
  );

  return { servers, loading, refresh, addServer, editServer, removeServer };
}
