import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { SettingsFieldRow } from '@/components/settings/SettingsFieldRow';
import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import { appIdentity } from '@/config/appIdentity';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useServers } from '@/db/hooks/useServers';
import { useUserPreferences } from '@/db/hooks/useUserPreferences';
import { getLatestSyncError } from '@/db/queries';
import type { DocumentIdMode } from '@/db/schema';
import { lightImpactHaptic, notificationErrorHaptic, notificationSuccessHaptic } from '@/lib/haptics';
import { getKoreaderPassword } from '@/services/koreader/credentials';
import { testKoreaderConnection } from '@/services/koreader/client';
import { saveDefaultSyncAccount } from '@/services/koreader/syncBook';
import { getServerPassword } from '@/services/opds/credentials';
import { deriveKosyncUrlFromOpdsUrl } from '@/services/opds/url';
import { resolveKosyncProfile } from '@/services/koreader/profile';
import { useTheme } from '@/theme/ThemeProvider';

type ActionFeedback = {
  variant: 'success' | 'error';
  message: string;
};

export default function KoreaderSettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { servers } = useServers();
  const { activeServerId } = useActiveServer();
  const { syncAccount, loading, refresh, updateKoreaderSyncEnabled } = useUserPreferences();

  const [serverUrl, setServerUrl] = useState(appIdentity.koreaderDefaultServerUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [documentIdMode, setDocumentIdMode] = useState<DocumentIdMode>('partial_md5');
  const [enabled, setEnabled] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lastSyncError, setLastSyncError] = useState<string | null>(null);
  const [testFeedback, setTestFeedback] = useState<ActionFeedback | null>(null);
  const [saveFeedback, setSaveFeedback] = useState<ActionFeedback | null>(null);

  const activeServer = servers.find((server) => server.id === activeServerId) ?? servers[0];

  useEffect(() => {
    if (loading || initialized) {
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const stored = await getKoreaderPassword();
        const latestError = await getLatestSyncError(db);
        const defaultUrl = activeServer
          ? deriveKosyncUrlFromOpdsUrl(activeServer.url)
          : appIdentity.koreaderDefaultServerUrl;

        let effectivePassword = stored ?? '';
        if (!effectivePassword && activeServer?.auth_username) {
          effectivePassword = (await getServerPassword(activeServer.id)) ?? '';
        }

        setServerUrl(
          resolveKosyncProfile(syncAccount?.server_url ?? defaultUrl).baseUrl,
        );
        setUsername(syncAccount?.username ?? activeServer?.auth_username ?? '');
        setPassword(effectivePassword);
        setDocumentIdMode(syncAccount?.document_id_mode ?? 'partial_md5');
        setEnabled((syncAccount?.enabled ?? 0) === 1);
        setLastSyncError(latestError);
        setInitialized(true);
      })();
    });
  }, [activeServer, db, initialized, loading, syncAccount]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setTestFeedback(null);

    try {
      if (!username.trim() || !password) {
        throw new Error(t('sync.errorCredentials'));
      }
      await testKoreaderConnection(serverUrl.trim(), username.trim(), password);
      setTestFeedback({ variant: 'success', message: t('sync.testSuccess') });
      void notificationSuccessHaptic();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sync.testFailed');
      setTestFeedback({ variant: 'error', message });
      void notificationErrorHaptic();
    } finally {
      setTesting(false);
    }
  }, [password, serverUrl, t, username]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveFeedback(null);

    try {
      if (!serverUrl.trim() || !username.trim() || !password) {
        throw new Error(t('sync.errorCredentials'));
      }

      await saveDefaultSyncAccount(db, {
        serverUrl: serverUrl.trim(),
        username: username.trim(),
        password,
        documentIdMode,
        enabled,
      });
      await updateKoreaderSyncEnabled(enabled);
      await refresh();
      setLastSyncError(null);
      setSaveFeedback({ variant: 'success', message: t('sync.saveSuccess') });
      void notificationSuccessHaptic();
    } catch (err) {
      const message = err instanceof Error ? err.message : t('sync.saveFailed');
      setSaveFeedback({ variant: 'error', message });
      void notificationErrorHaptic();
    } finally {
      setSaving(false);
    }
  }, [
    db,
    documentIdMode,
    enabled,
    password,
    refresh,
    serverUrl,
    t,
    updateKoreaderSyncEnabled,
    username,
  ]);

  if (loading || !initialized) {
    return (
      <Box flex={1} alignItems="center" justifyContent="center" backgroundColor="background">
        <ActivityIndicator color={theme.colors.text} />
      </Box>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollBox
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 16,
          paddingBottom: insets.bottom + 48,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <SettingsGroup header={t('sync.header')} footer={t('sync.footer')}>
          <SettingsRow
            title={t('sync.enable')}
            rightElement={
              <Switch
                value={enabled}
                onValueChange={setEnabled}
                trackColor={{ false: theme.colors.border, true: theme.colors.accentMuted }}
              />
            }
          />
          <SettingsFieldRow
            label={t('sync.serverUrl')}
            value={serverUrl}
            onChangeText={setServerUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={
              activeServer
                ? deriveKosyncUrlFromOpdsUrl(activeServer.url)
                : appIdentity.koreaderDefaultServerUrl
            }
          />
          <SettingsFieldRow
            label={t('sync.username')}
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <SettingsFieldRow
            label={t('sync.password')}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </SettingsGroup>

        {lastSyncError ? (
          <Box paddingHorizontal="md" paddingBottom="sm">
            <ThemedText variant="caption" color={theme.colors.error}>
              {t('sync.lastError', { message: lastSyncError })}
            </ThemedText>
          </Box>
        ) : null}

        <SettingsGroup header={t('sync.documentIdHeader')} footer={t('sync.documentIdFooter')}>
          <SettingsRow
            title={t('sync.documentIdPartial')}
            selected={documentIdMode === 'partial_md5'}
            onPress={() => setDocumentIdMode('partial_md5')}
          />
          <SettingsRow
            title={t('sync.documentIdFilename')}
            selected={documentIdMode === 'filename'}
            onPress={() => setDocumentIdMode('filename')}
          />
        </SettingsGroup>

        <Box gap="sm" marginTop="md">
          <PressableBox
            alignItems="center"
            justifyContent="center"
            minHeight={48}
            borderRadius="full"
            backgroundColor="secondary"
            onPress={() => {
              void lightImpactHaptic();
              void handleTest();
            }}
            disabled={testing}
            testID="sync-test-connection"
          >
            {testing ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <ThemedText>{t('sync.testConnection')}</ThemedText>
            )}
          </PressableBox>

          {testFeedback ? (
            <ThemedText
              variant="caption"
              color={testFeedback.variant === 'error' ? theme.colors.error : theme.colors.success}
              testID="sync-test-feedback"
              accessibilityLiveRegion="polite"
              style={{ textAlign: 'center' }}
            >
              {testFeedback.message}
            </ThemedText>
          ) : null}

          <PressableBox
            alignItems="center"
            justifyContent="center"
            minHeight={48}
            borderRadius="full"
            backgroundColor="primary"
            onPress={() => {
              void lightImpactHaptic();
              void handleSave();
            }}
            disabled={saving}
            testID="sync-save-settings"
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <ThemedText color={theme.colors.onPrimary}>{t('sync.save')}</ThemedText>
            )}
          </PressableBox>

          {saveFeedback ? (
            <ThemedText
              variant="caption"
              color={saveFeedback.variant === 'error' ? theme.colors.error : theme.colors.success}
              testID="sync-save-feedback"
              accessibilityLiveRegion="polite"
              style={{ textAlign: 'center' }}
            >
              {saveFeedback.message}
            </ThemedText>
          ) : null}
        </Box>
      </ScrollBox>
    </KeyboardAvoidingView>
  );
}
