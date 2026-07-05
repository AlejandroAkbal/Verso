import { useRouter } from 'expo-router';

import { ServerForm } from '@/components/settings/ServerForm';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useServers } from '@/db/hooks/useServers';

export default function AddServerScreen() {
  const router = useRouter();
  const { addServer } = useServers();
  const { setActive } = useActiveServer();

  return (
    <ServerForm
      showHelper
      onSubmit={async (input) => {
        const server = await addServer(input);
        await setActive(server.id);
        router.back();
      }}
    />
  );
}
