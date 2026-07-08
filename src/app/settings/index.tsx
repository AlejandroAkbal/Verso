import { useRouter } from 'expo-router';
import { Alert, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSQLiteContext } from 'expo-sqlite';

import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { Box, ScrollBox } from '@/components/ui';
import { useUserPreferences } from '@/db/hooks/useUserPreferences';
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
  const { prefs, updateResumeLastBook } = useUserPreferences();
  const resumeLastBook = (prefs?.resume_last_book ?? 0) === 1;

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
      style={{ flex: 1, backgroundColor: theme.colors.surface }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollBox
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 48,
        }}
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

      <SettingsGroup header={t('sync.title')} footer={t('sync.settingsFooter')}>
        <SettingsRow
          title={t('sync.title')}
          subtitle={t('sync.settingsRowHint')}
          showChevron
          testID="settings-koreader-sync"
          onPress={() => router.push('/settings/koreader')}
        />
      </SettingsGroup>

      <SettingsGroup header={t('settings.readingHeader')}>
        <SettingsRow
          title={t('reader.settingsTitle')}
          subtitle={t('reader.settingsRowHint')}
          showChevron
          testID="settings-reader"
          onPress={() => router.push('/settings/reader')}
        />
        <SettingsRow
          title={t('settings.resumeLastBook')}
          subtitle={t('settings.resumeLastBookHint')}
          rightElement={
            <Switch
              value={resumeLastBook}
              onValueChange={(value) => {
                void updateResumeLastBook(value);
              }}
              trackColor={{ false: theme.colors.border, true: theme.colors.accentMuted }}
            />
          }
          testID="settings-resume-last-book"
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
        <Box paddingHorizontal="lg">
          <ThemedText
            variant="body"
            color={theme.colors.textSecondary}
            style={{ textAlign: 'center', lineHeight: 22 }}
          >
            {t('settings.emptyServers')}
          </ThemedText>
        </Box>
      ) : null}
      </ScrollBox>
    </KeyboardAvoidingView>
  );
}
