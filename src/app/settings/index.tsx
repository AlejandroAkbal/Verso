import { useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { useServers } from '@/db/hooks/useServers';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useDownloadStorageStats } from '@/hooks/useDownloadStorage';
import { queryClient } from '@/lib/queryClient';
import { clearAllAppData } from '@/services/app/reset';
import {
  formatStorageSize,
  removeAllDownloads,
} from '@/services/downloads/manage';
import { useTheme } from '@/theme/ThemeProvider';

function leaveSettingsFor(router: ReturnType<typeof useRouter>, href: '/' | '/(onboarding)') {
  if (router.canDismiss()) {
    router.dismiss();
  }
  router.replace(href);
}

export default function SettingsIndexScreen() {
  const theme = useTheme();
  const router = useRouter();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const { servers } = useServers();
  const { activeServerId, setActive } = useActiveServer();
  const { stats, refresh } = useDownloadStorageStats();
  const insets = useSafeAreaInsets();

  const handleRemoveAll = () => {
    if (stats.count === 0) return;

    Alert.alert(
      t('downloads.removeAllTitle'),
      t('downloads.removeAllMessage', {
        count: stats.count,
        size: formatStorageSize(stats.bytes),
      }),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('downloads.removeAll'),
          style: 'destructive',
          onPress: () => {
            void removeAllDownloads(db).then(() => refresh());
          },
        },
      ],
    );
  };

  const handleShowIntroAgain = () => {
    leaveSettingsFor(router, '/(onboarding)');
  };

  const handleResetAllData = () => {
    Alert.alert(
      t('settings.resetAllTitle'),
      t('settings.resetAllMessage'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('settings.resetAllConfirm'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await clearAllAppData(db);
              queryClient.clear();
              leaveSettingsFor(router, '/');
            })();
          },
        },
      ],
    );
  };

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 48 }]}
        contentInsetAdjustmentBehavior="automatic"
        automaticallyAdjustKeyboardInsets
        keyboardShouldPersistTaps="handled"
      >
      <SettingsGroup
        header={t('settings.configuredServers')}
        footer={t('settings.listFooter')}
      >
        {servers.map((server) => (
          <SettingsRow
            key={server.id}
            title={server.title}
            subtitle={
              server.auth_username
                ? `${server.url}\n${t('settings.auth', { username: server.auth_username })}`
                : server.url
            }
            selected={server.id === activeServerId}
            onPress={() => {
              if (server.id === activeServerId) return;
              void setActive(server.id).then(() => router.back());
            }}
            accessoryOnPress={() => router.push(`/settings/${server.id}`)}
          />
        ))}
        <SettingsRow
          title={t('settings.addServer')}
          icon="plus.circle.fill"
          onPress={() => router.push('/settings/add')}
        />
      </SettingsGroup>

      <SettingsGroup
        header={t('downloads.storageHeader')}
        footer={t('downloads.storageFooter')}
      >
        <SettingsRow
          title={
            stats.count > 0
              ? t('downloads.storageSummary', {
                  count: stats.count,
                  size: formatStorageSize(stats.bytes),
                })
              : t('downloads.storageEmpty')
          }
        />
        {stats.count > 0 ? (
          <SettingsRow
            title={t('downloads.removeAll')}
            destructive
            onPress={handleRemoveAll}
          />
        ) : null}
      </SettingsGroup>

      <SettingsGroup
        header={t('settings.advancedHeader')}
        footer={t('settings.showIntroAgainFooter')}
      >
        <SettingsRow
          title={t('settings.showIntroAgain')}
          onPress={handleShowIntroAgain}
        />
        <SettingsRow
          title={t('settings.resetAllData')}
          destructive
          onPress={handleResetAllData}
        />
      </SettingsGroup>

      {servers.length === 0 ? (
        <ThemedText variant="body" color={theme.colors.textSecondary} style={styles.empty}>
          {t('settings.emptyServers')}
        </ThemedText>
      ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  empty: {
    textAlign: 'center',
    paddingHorizontal: 24,
    lineHeight: 22,
  },
});
