import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ServerForm } from '@/components/settings/ServerForm';
import { ThemedText } from '@/components/ThemedText';
import { useActiveServer } from '@/db/hooks/useActiveServer';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useServers } from '@/db/hooks/useServers';
import { useTheme } from '@/theme/ThemeProvider';

let devPrefill: Partial<{
  url: string;
  username: string;
  password: string;
}> = {};

if (__DEV__) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    devPrefill = require('@/config/dev-secrets').DEV_OPDS;
  } catch {
    devPrefill = {};
  }
}

export default function OnboardingConnectScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { addServer } = useServers();
  const { setActive } = useActiveServer();
  const { completeOnboarding } = useOnboarding();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.nav, { paddingTop: insets.top + 8 }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <SymbolView name="chevron.left" size={18} tintColor={theme.colors.textSecondary} />
          <ThemedText variant="body" color={theme.colors.textSecondary}>
            {t('common.back')}
          </ThemedText>
        </Pressable>
      </View>

      <View style={styles.header}>
        <ThemedText variant="title">{t('onboarding.connectTitle')}</ThemedText>
        <ThemedText variant="body" color={theme.colors.textSecondary}>
          {t('onboarding.connectStep')}
        </ThemedText>
      </View>

      <ServerForm
        initial={devPrefill}
        showHelper
        submitLabelKey="serverForm.saveAndOpen"
        onSubmit={async (input) => {
          const server = await addServer(input);
          await setActive(server.id);
          await completeOnboarding();
          router.replace('/(tabs)');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  nav: {
    paddingHorizontal: 8,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  header: {
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
});
