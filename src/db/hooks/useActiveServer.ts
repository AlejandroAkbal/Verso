import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getUserPreferences, setActiveServerId } from '@/db/queries';
import { useServers } from '@/db/hooks/useServers';
import { queryClient } from '@/lib/queryClient';
import type { ServerRow } from '@/db/schema';

export function useActiveServer() {
  const db = useSQLiteContext();
  const { servers, loading: serversLoading } = useServers();
  const [activeServerId, setActiveServerIdState] = useState('');
  const [prefsLoading, setPrefsLoading] = useState(true);

  const refresh = useCallback(async () => {
    const prefs = await getUserPreferences(db);
    setActiveServerIdState(prefs.active_server_id ?? '');
    setPrefsLoading(false);
  }, [db]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  const setActive = useCallback(
    async (serverId: string) => {
      await setActiveServerId(db, serverId);
      setActiveServerIdState(serverId);
      await queryClient.invalidateQueries({ queryKey: ['opds-catalog'] });
    },
    [db],
  );

  const activeServer = useMemo((): ServerRow | undefined => {
    if (servers.length === 0) return undefined;
    return servers.find((server) => server.id === activeServerId) ?? servers[0];
  }, [servers, activeServerId]);

  useEffect(() => {
    if (serversLoading || prefsLoading || servers.length === 0) return;

    const isCurrentValid = servers.some((server) => server.id === activeServerId);
    if (!isCurrentValid) {
      const fallbackServerId = servers[0].id;
      queueMicrotask(() => {
        void setActive(fallbackServerId);
      });
    }
  }, [activeServerId, prefsLoading, servers, serversLoading, setActive]);

  return {
    activeServer,
    activeServerId: activeServer?.id ?? '',
    setActive,
    loading: serversLoading || prefsLoading,
  };
}
