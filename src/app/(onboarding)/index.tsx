import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SymbolView } from 'expo-symbols';
import { useTranslation } from 'react-i18next';

import { ThemedText } from '@/components/ThemedText';
import { useServers } from '@/db/hooks/useServers';
import { useTheme } from '@/theme/ThemeProvider';

export default function OnboardingWelcomeScreen() {
  const theme = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { servers } = useServers();
  const hasLibrary = servers.length > 0;

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.background, paddingTop: insets.top + 32, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.hero}>
        <SymbolView name="books.vertical.fill" size={56} tintColor={theme.colors.text} />
        <ThemedText variant="title" style={styles.title}>
          Verso
        </ThemedText>
        <ThemedText variant="subtitle" color={theme.colors.textSecondary} style={styles.subtitle}>
          {t('onboarding.tagline')}
        </ThemedText>
        <ThemedText variant="body" color={theme.colors.textSecondary} style={styles.body}>
          {t('onboarding.description')}
        </ThemedText>
      </View>

      <View style={styles.points}>
        <Point
          icon="server.rack"
          title={t('onboarding.point1Title')}
          body={t('onboarding.point1Body')}
        />
        <Point
          icon="icloud.and.arrow.down"
          title={t('onboarding.point2Title')}
          body={t('onboarding.point2Body')}
        />
        <Point
          icon="lock.fill"
          title={t('onboarding.point3Title')}
          body={t('onboarding.point3Body')}
        />
      </View>

      <View style={styles.actions}>
        <Pressable
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={() => router.push('/(onboarding)/connect')}
        >
          <ThemedText variant="subtitle" color={theme.colors.onPrimary}>
            {t('onboarding.connectButton')}
          </ThemedText>
        </Pressable>
        {hasLibrary ? (
          <Pressable onPress={() => router.replace('/(tabs)')} hitSlop={8}>
            <ThemedText variant="body" color={theme.colors.textSecondary}>
              {t('onboarding.backToLibrary')}
            </ThemedText>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function Point({
  icon,
  title,
  body,
}: {
  icon: 'server.rack' | 'icloud.and.arrow.down' | 'lock.fill';
  title: string;
  body: string;
}) {
  const theme = useTheme();

  return (
    <View style={styles.point}>
      <SymbolView name={icon} size={22} tintColor={theme.colors.textSecondary} />
      <View style={styles.pointText}>
        <ThemedText variant="subtitle">{title}</ThemedText>
        <ThemedText variant="caption" color={theme.colors.textSecondary}>
          {body}
        </ThemedText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'space-between',
  },
  hero: {
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontSize: 34,
    marginTop: 8,
  },
  subtitle: {
    textAlign: 'center',
  },
  body: {
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  points: {
    gap: 20,
  },
  point: {
    flexDirection: 'row',
    gap: 14,
    alignItems: 'flex-start',
  },
  pointText: {
    flex: 1,
    gap: 4,
  },
  button: {
    alignItems: 'center',
    paddingVertical: 16,
    borderRadius: 9999,
    width: '100%',
  },
  actions: {
    gap: 16,
    alignItems: 'center',
  },
});
