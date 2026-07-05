import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/ThemedText';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useServers } from '@/db/hooks/useServers';
import { theme } from '@/theme/theme';

export default function Index() {
  const { completed, loading: onboardingLoading } = useOnboarding();
  const { servers, loading: serversLoading } = useServers();

  if (onboardingLoading || serversLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color={theme.colors.text} />
        <ThemedText color={theme.colors.textSecondary}>Opening Verso…</ThemedText>
      </View>
    );
  }

  if (!completed || servers.length === 0) {
    return <Redirect href="/(onboarding)" />;
  }

  return <Redirect href="/(tabs)" />;
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.background,
    gap: 12,
  },
});
