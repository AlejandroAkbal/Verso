import { useCallback, useEffect, useState } from 'react';
import { useSQLiteContext } from 'expo-sqlite';

import { getServerById } from '@/db/queries';
import { authToHeaders, getServerAuth } from '@/services/opds/credentials';

export function useServerAuthHeaders(serverId: string | undefined) {
  const db = useSQLiteContext();
  const [headers, setHeaders] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    if (!serverId) {
      setHeaders({});
      return;
    }

    const server = await getServerById(db, serverId);
    if (!server?.auth_username) {
      setHeaders({});
      return;
    }

    const auth = await getServerAuth(server.id, server.auth_username);
    setHeaders(authToHeaders(auth));
  }, [db, serverId]);

  useEffect(() => {
    queueMicrotask(() => {
      void refresh();
    });
  }, [refresh]);

  return headers;
}
