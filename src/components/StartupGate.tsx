import { Redirect } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSQLiteContext } from 'expo-sqlite';

import { ThemedText } from '@/components/ThemedText';
import { Box } from '@/components/ui';
import { useOnboarding } from '@/db/hooks/useOnboarding';
import { useServers } from '@/db/hooks/useServers';
import { getDownloadByBookId, getUserPreferences } from '@/db/queries';
import { promptSyncConflict } from '@/lib/syncPrompt';
import { isDownloadComplete } from '@/services/downloads/manage';
import {
  applyRemotePercentage,
  pullRemoteProgressForBook,
} from '@/services/koreader/syncBook';
import { theme } from '@/theme/theme';

type Destination = '/(onboarding)' | '/(tabs)' | `/reader/${string}`;

export function StartupGate() {
  const { t } = useTranslation();
  const db = useSQLiteContext();
  const { completed, loading: onboardingLoading } = useOnboarding();
  const { servers, loading: serversLoading } = useServers();
  const [destination, setDestination] = useState<Destination | null>(null);
  const [resumeHandled, setResumeHandled] = useState(false);

  useEffect(() => {
    if (onboardingLoading || serversLoading || resumeHandled) {
      return;
    }

    if (!completed || servers.length === 0) {
      queueMicrotask(() => {
        setDestination('/(onboarding)');
        setResumeHandled(true);
      });
      return;
    }

    queueMicrotask(() => {
      void (async () => {
        const prefs = await getUserPreferences(db);

        if (prefs.resume_last_book !== 1 || !prefs.last_open_book_id) {
          setDestination('/(tabs)');
          setResumeHandled(true);
          return;
        }

        const download = await getDownloadByBookId(db, prefs.last_open_book_id);
        if (!isDownloadComplete(download)) {
          setDestination('/(tabs)');
          setResumeHandled(true);
          return;
        }

        const pull = await pullRemoteProgressForBook(db, prefs.last_open_book_id);

        const openReader = () => {
          setDestination(`/reader/${prefs.last_open_book_id}`);
          setResumeHandled(true);
        };

        if (pull.hasConflict && pull.remote) {
          promptSyncConflict(
            t,
            () => {
              void applyRemotePercentage(
                db,
                prefs.last_open_book_id,
                pull.remote!.percentage,
              ).then(openReader);
            },
            openReader,
          );
          return;
        }

        openReader();
      })();
    });
  }, [
    completed,
    db,
    onboardingLoading,
    resumeHandled,
    servers.length,
    serversLoading,
    t,
  ]);

  if (onboardingLoading || serversLoading || !resumeHandled) {
    return (
      <Box
        flex={1}
        alignItems="center"
        justifyContent="center"
        backgroundColor="background"
        gap="md"
      >
        <ActivityIndicator color={theme.colors.text} />
        <ThemedText color={theme.colors.textSecondary}>
          {t('loading.openingLibrary')}
        </ThemedText>
      </Box>
    );
  }

  if (destination?.startsWith('/reader/')) {
    return <Redirect href={destination} />;
  }

  return <Redirect href={destination ?? '/(tabs)'} />;
}
