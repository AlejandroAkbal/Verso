import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useEffect, useLayoutEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';

import {
  confirmDeleteServer,
  ServerForm,
} from '@/components/settings/ServerForm';
import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { Box } from '@/components/ui';
import { SettingsRow } from '@/components/settings/SettingsRow';
import type { ServerInput } from '@/db/hooks/useServers';
import { useServers } from '@/db/hooks/useServers';
import { getServerPassword } from '@/services/opds/credentials';
import { useTheme } from '@/theme/ThemeProvider';

function resolveParam(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return value;
}

export default function EditServerScreen() {
  const params = useLocalSearchParams<{ id: string }>();
  const serverId = resolveParam(params.id);
  const router = useRouter();
  const navigation = useNavigation();
  const theme = useTheme();
  const { t } = useTranslation();
  const { servers, loading, editServer, removeServer } = useServers();
  const server = servers.find((s) => s.id === serverId);
  const [initial, setInitial] = useState<Partial<ServerInput> | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({
      title: server?.title ?? t('settings.editServer'),
    });
  }, [navigation, server?.title, t]);

  useEffect(() => {
    if (loading) return;

    if (!server) {
      router.back();
      return;
    }

    let cancelled = false;
    void (async () => {
      const password = (await getServerPassword(server.id)) ?? '';
      if (!cancelled) {
        setInitial({
          url: server.url,
          username: server.auth_username,
          password,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loading, router, server]);

  if (loading || !serverId) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
      >
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  if (!server || !initial) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
      >
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  return (
    <ServerForm
      serverId={server.id}
      initial={initial}
      onSubmit={async (input) => {
        const password = input.password || (await getServerPassword(server.id)) || '';
        await editServer(server.id, { ...input, password });
        router.back();
      }}
      trailingContent={
        <SettingsGroup>
          <SettingsRow
            title={t('settings.deleteServer')}
            destructive
            onPress={() => {
              confirmDeleteServer(
                server.title,
                () => {
                  void removeServer(server.id).then(() => router.back());
                },
                t,
              );
            }}
          />
        </SettingsGroup>
      }
    />
  );
}
