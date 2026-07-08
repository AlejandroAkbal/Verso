import AsyncStorage from '@react-native-async-storage/async-storage';
import type { Preferences } from 'react-native-readium';

import { appIdentity } from '@/config/appIdentity';

const STORAGE_KEY = `${appIdentity.slug}.reader.preferences`;

export type ReaderTheme = NonNullable<Preferences['theme']>;
export type ReaderFontFamily = NonNullable<Preferences['fontFamily']>;
export type ReaderTextAlign = NonNullable<Preferences['textAlign']>;

export type StoredReaderPreferences = {
  fontSize: number;
  theme: ReaderTheme;
  fontFamily: ReaderFontFamily;
  publisherStyles: boolean;
  lineHeight: number;
  pageMargins: number;
  textAlign: ReaderTextAlign;
};

export const DEFAULT_READER_PREFERENCES: StoredReaderPreferences = {
  fontSize: 1.125,
  theme: 'dark',
  fontFamily: 'serif',
  publisherStyles: true,
  lineHeight: 1.4,
  pageMargins: 1.25,
  textAlign: 'justify',
};

export function toReadiumPreferences(
  prefs: StoredReaderPreferences,
): Preferences {
  return {
    theme: prefs.theme,
    fontSize: prefs.fontSize,
    fontFamily: prefs.fontFamily,
    publisherStyles: prefs.publisherStyles,
    lineHeight: prefs.lineHeight,
    pageMargins: prefs.pageMargins,
    textAlign: prefs.textAlign,
  };
}

export async function loadReaderPreferences(): Promise<StoredReaderPreferences> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return DEFAULT_READER_PREFERENCES;
    }
    const parsed = JSON.parse(raw) as Partial<StoredReaderPreferences>;
    return { ...DEFAULT_READER_PREFERENCES, ...parsed };
  } catch {
    return DEFAULT_READER_PREFERENCES;
  }
}

export async function saveReaderPreferences(
  prefs: StoredReaderPreferences,
): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
}

export async function deleteReaderPreferences(): Promise<void> {
  await AsyncStorage.removeItem(STORAGE_KEY);
}
