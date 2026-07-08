import { Stack, useRouter } from 'expo-router';
import { useRef, useCallback, useState } from 'react';
import type { Link, ReadiumViewRef, Locator } from 'react-native-readium';

import { ReaderContext } from '@/context/ReaderContext';
import { useReaderPreferences } from '@/hooks/useReaderPreferences';
import { lightImpactHaptic } from '@/lib/haptics';
import { nativeModalHeaderOptions } from '@/theme/nativeModal';
import { useTheme } from '@/theme/ThemeProvider';

function linkToLocator(link: Link): Locator {
  const href = link.href.startsWith('/') ? link.href.slice(1) : link.href;
  return {
    href,
    type: 'application/xhtml+xml',
    title: link.title,
  };
}

export default function ReaderLayout() {
  const readiumRef = useRef<ReadiumViewRef | null>(null);
  const { prefs, updatePrefs } = useReaderPreferences();
  const [tableOfContents, setTableOfContents] = useState<Link[]>([]);
  const router = useRouter();
  const theme = useTheme();

  const handleTocSelect = useCallback((link: Link) => {
    void lightImpactHaptic();
    readiumRef.current?.goTo(linkToLocator(link));
    router.back();
  }, [router]);

  return (
    <ReaderContext.Provider
      value={{
        readiumRef,
        tableOfContents,
        setTableOfContents,
        prefs,
        updatePrefs,
        handleTocSelect,
      }}
    >
      <Stack
        screenOptions={{
          ...nativeModalHeaderOptions(theme),
          contentStyle: { backgroundColor: theme.colors.surface },
        }}
      >
        <Stack.Screen name="[id]" options={{ headerShown: false }} />
        <Stack.Screen name="toc" options={{ presentation: 'modal' }} />
        <Stack.Screen name="settings" options={{ presentation: 'modal' }} />
      </Stack>
    </ReaderContext.Provider>
  );
}
