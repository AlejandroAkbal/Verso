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
import { useUserPreferences } from '@/db/hooks/useUserPreferences';
import type { DocumentIdMode } from '@/db/schema';
import { buildAuthHeaders, getKoreaderPassword } from '@/services/koreader/credentials';
import { testKoreaderConnection } from '@/services/koreader/client';
import { saveDefaultSyncAccount } from '@/services/koreader/syncBook';
import { useTheme } from '@/theme/ThemeProvider';

export default function KoreaderSettingsScreen() {
  const theme = useTheme();
  const db = useSQLiteContext();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { syncAccount, loading, refresh, updateKoreaderSyncEnabled, updateResumeLastBook, prefs } =
    useUserPreferences();

  const [serverUrl, setServerUrl] = useState(appIdentity.koreaderDefaultServerUrl);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [documentIdMode, setDocumentIdMode] = useState<DocumentIdMode>('partial_md5');
  const [enabled, setEnabled] = useState(false);
  const [resumeLastBook, setResumeLastBook] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (loading || initialized) {
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const stored = await getKoreaderPassword();
        setServerUrl(syncAccount?.server_url ?? appIdentity.koreaderDefaultServerUrl);
        setUsername(syncAccount?.username ?? '');
        setPassword(stored ?? '');
        setDocumentIdMode(syncAccount?.document_id_mode ?? 'partial_md5');
        setEnabled((syncAccount?.enabled ?? 0) === 1);
        setResumeLastBook((prefs?.resume_last_book ?? 0) === 1);
        setInitialized(true);
      })();
    });
  }, [initialized, loading, prefs?.resume_last_book, syncAccount]);

  const handleTest = useCallback(async () => {
    setTesting(true);
    setError(null);
    setStatus(null);

    try {
      const auth = await buildAuthHeaders(username.trim(), password);
      if (!auth) {
        throw new Error(t('sync.errorCredentials'));
      }
      await testKoreaderConnection(serverUrl.trim(), auth);
      setStatus(t('sync.testSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sync.testFailed'));
    } finally {
      setTesting(false);
    }
  }, [password, serverUrl, t, username]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    setStatus(null);

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
      await updateResumeLastBook(resumeLastBook);
      await refresh();
      setStatus(t('sync.saveSuccess'));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('sync.saveFailed'));
    } finally {
      setSaving(false);
    }
  }, [
    db,
    documentIdMode,
    enabled,
    password,
    refresh,
    resumeLastBook,
    serverUrl,
    t,
    updateKoreaderSyncEnabled,
    updateResumeLastBook,
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
            placeholder={appIdentity.koreaderDefaultServerUrl}
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

        <SettingsGroup header={t('sync.readingHeader')}>
          <SettingsRow
            title={t('sync.resumeLastBook')}
            subtitle={t('sync.resumeLastBookHint')}
            rightElement={
              <Switch
                value={resumeLastBook}
                onValueChange={setResumeLastBook}
                trackColor={{ false: theme.colors.border, true: theme.colors.accentMuted }}
              />
            }
          />
        </SettingsGroup>

        <Box gap="sm" marginTop="md">
          <PressableBox
            alignItems="center"
            justifyContent="center"
            minHeight={48}
            borderRadius="full"
            backgroundColor="secondary"
            onPress={() => void handleTest()}
            disabled={testing}
          >
            {testing ? (
              <ActivityIndicator color={theme.colors.text} />
            ) : (
              <ThemedText>{t('sync.testConnection')}</ThemedText>
            )}
          </PressableBox>

          <PressableBox
            alignItems="center"
            justifyContent="center"
            minHeight={48}
            borderRadius="full"
            backgroundColor="primary"
            onPress={() => void handleSave()}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color={theme.colors.onPrimary} />
            ) : (
              <ThemedText color={theme.colors.onPrimary}>{t('sync.save')}</ThemedText>
            )}
          </PressableBox>

          {status ? (
            <ThemedText variant="caption" color={theme.colors.textSecondary}>
              {status}
            </ThemedText>
          ) : null}
          {error ? (
            <ThemedText variant="caption" color={theme.colors.error}>
              {error}
            </ThemedText>
          ) : null}
        </Box>
      </ScrollBox>
    </KeyboardAvoidingView>
  );
}
