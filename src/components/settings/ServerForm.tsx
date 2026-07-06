import { useCallback, useEffect, useState, type ReactNode } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';

import { SettingsFieldRow, SettingsMultilineField } from '@/components/settings/SettingsFieldRow';
import { SettingsGroup } from '@/components/settings/SettingsGroup';
import { SettingsRow } from '@/components/settings/SettingsRow';
import { ThemedText } from '@/components/ThemedText';
import { Box, PressableBox, ScrollBox } from '@/components/ui';
import type { ServerInput } from '@/db/hooks/useServers';
import { getServerPassword } from '@/services/opds/credentials';
import { testOpdsConnection } from '@/services/opds/connection';
import { normalizeOpdsUrl } from '@/services/opds/url';
import { useTheme } from '@/theme/ThemeProvider';

type ServerFormProps = {
  serverId?: string;
  initial?: Partial<ServerInput>;
  showHelper?: boolean;
  trailingContent?: ReactNode;
  submitLabelKey?: 'settings.addButton' | 'settings.updateButton' | 'serverForm.saveAndOpen';
  onSubmit: (input: ServerInput) => Promise<void>;
};

export function ServerForm({
  serverId,
  initial,
  showHelper = false,
  trailingContent,
  submitLabelKey,
  onSubmit,
}: ServerFormProps) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [url, setUrl] = useState(initial?.url ?? '');
  const [username, setUsername] = useState(initial?.username ?? '');
  const [password, setPassword] = useState(initial?.password ?? '');
  const [showPassword, setShowPassword] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(Boolean(serverId && !initial?.password));

  useEffect(() => {
    if (!serverId) return;

    let cancelled = false;
    queueMicrotask(() => {
      void (async () => {
        if (initial?.password) {
          setLoadingPassword(false);
          return;
        }
        const stored = await getServerPassword(serverId);
        if (!cancelled && stored) {
          setPassword(stored);
        }
        if (!cancelled) {
          setLoadingPassword(false);
        }
      })();
    });

    return () => {
      cancelled = true;
    };
  }, [serverId, initial?.password]);

  const resolveAuth = useCallback(async () => {
    let effectivePassword = password;
    if (!effectivePassword && serverId) {
      effectivePassword = (await getServerPassword(serverId)) ?? '';
    }

    if (!username.trim() || !effectivePassword) {
      return null;
    }

    return { username: username.trim(), password: effectivePassword };
  }, [password, serverId, username]);

  const buildInput = useCallback(async (): Promise<ServerInput> => {
    let effectivePassword = password;
    if (!effectivePassword && serverId) {
      effectivePassword = (await getServerPassword(serverId)) ?? '';
    }

    return { url, username, password: effectivePassword };
  }, [password, serverId, url, username]);

  const handleTest = async () => {
    if (!url.trim()) {
      setError(t('serverForm.errorUrlFirst'));
      return;
    }

    setTesting(true);
    setError(null);
    setStatus(null);

    try {
      const normalized = normalizeOpdsUrl(url);
      const auth = await resolveAuth();
      const result = await testOpdsConnection(normalized, auth);

      if (result.ok) {
        const countLabel =
          result.entryCount && result.entryCount > 0
            ? t('serverForm.statusBooksFound', { count: result.entryCount })
            : t('serverForm.statusCatalogReachable');
        setStatus(
          t('serverForm.statusConnected', {
            countLabel,
            title: result.title ?? t('common.catalog'),
          }),
        );
      } else {
        setError(result.error ?? t('serverForm.errorConnectionFailed'));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t('serverForm.errorConnectionFailed'));
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async () => {
    if (!url.trim()) {
      setError(t('serverForm.errorUrlRequired'));
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSubmit(await buildInput());
    } catch (err) {
      setError(err instanceof Error ? err.message : t('serverForm.errorSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 96 : 0}
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
        keyboardDismissMode="on-drag"
      >
      {showHelper ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textMuted}
          style={{ marginBottom: 16, marginHorizontal: 4, lineHeight: 20 }}
        >
          {t('serverForm.helper', { url: t('serverForm.helperUrl') })}
        </ThemedText>
      ) : null}

      <SettingsGroup header={t('serverForm.urlLabel')}>
        <SettingsMultilineField
          label=""
          placeholder={t('serverForm.urlPlaceholder')}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          textContentType="URL"
        />
      </SettingsGroup>

      <SettingsGroup header={t('serverForm.authLabel')}>
        <SettingsFieldRow
          label=""
          placeholder={t('serverForm.usernamePlaceholder')}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          autoCorrect={false}
          textContentType="username"
        />
        <Box position="relative">
          <SettingsFieldRow
            label=""
            placeholder={
              loadingPassword ? t('serverForm.loadingPassword') : t('serverForm.passwordPlaceholder')
            }
            value={password}
            onChangeText={setPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            editable={!loadingPassword}
            style={{ paddingRight: 40 }}
          />
          <PressableBox
            onPress={() => setShowPassword((v) => !v)}
            position="absolute"
            right={12}
            bottom={14}
            padding="xs"
            hitSlop={8}
          >
            <SymbolView
              name={showPassword ? 'eye.slash' : 'eye'}
              size={18}
              tintColor={theme.colors.textMuted}
            />
          </PressableBox>
        </Box>
      </SettingsGroup>

      {error ? (
        <ThemedText
          variant="caption"
          color={theme.colors.error}
          style={{ marginHorizontal: 16, marginBottom: 12, lineHeight: 18 }}
        >
          {error}
        </ThemedText>
      ) : null}
      {status ? (
        <ThemedText
          variant="caption"
          color={theme.colors.textSecondary}
          style={{ marginHorizontal: 16, marginBottom: 12, lineHeight: 18 }}
        >
          {status}
        </ThemedText>
      ) : null}

      <SettingsGroup>
        <SettingsRow
          title={t('serverForm.testConnection')}
          onPress={() => void handleTest()}
          disabled={testing || saving || loadingPassword}
          rightElement={
            testing ? <ActivityIndicator color={theme.colors.text} size="small" /> : null
          }
        />
      </SettingsGroup>

      <SettingsGroup footer={t('settings.serverFooter')}>
        <SettingsRow
          title={
            submitLabelKey
              ? t(submitLabelKey)
              : serverId
                ? t('settings.updateButton')
                : t('settings.addButton')
          }
          onPress={() => void handleSubmit()}
          disabled={testing || saving || loadingPassword}
          rightElement={
            saving ? <ActivityIndicator color={theme.colors.text} size="small" /> : null
          }
        />
      </SettingsGroup>

      {trailingContent}
      </ScrollBox>
    </KeyboardAvoidingView>
  );
}

export function confirmDeleteServer(
  title: string,
  onConfirm: () => void,
  t: TFunction,
): void {
  Alert.alert(
    t('settings.deleteTitle'),
    t('settings.deleteMessage', { name: title }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: onConfirm },
    ],
  );
}
