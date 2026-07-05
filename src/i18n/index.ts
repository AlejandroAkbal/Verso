import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { I18nManager } from 'react-native';

import ar from './locales/ar.json';
import en from './locales/en.json';
import es from './locales/es.json';
import hi from './locales/hi.json';
import zh from './locales/zh.json';

export const SUPPORTED_LOCALES = ['en', 'es', 'zh', 'hi', 'ar'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];

const resources = {
  en: { translation: en },
  es: { translation: es },
  zh: { translation: zh },
  hi: { translation: hi },
  ar: { translation: ar },
};

function normalizeLocale(languageTag: string | undefined): SupportedLocale {
  if (!languageTag) return 'en';

  const base = languageTag.split('-')[0]?.toLowerCase();
  if (base === 'zh') return 'zh';
  if (SUPPORTED_LOCALES.includes(base as SupportedLocale)) {
    return base as SupportedLocale;
  }

  return 'en';
}

export function resolveDeviceLocale(): SupportedLocale {
  const primary = getLocales()[0];
  return normalizeLocale(primary?.languageCode ?? primary?.languageTag ?? undefined);
}

function applyRtl(locale: SupportedLocale): void {
  const shouldUseRtl = locale === 'ar';
  if (I18nManager.isRTL !== shouldUseRtl) {
    I18nManager.allowRTL(shouldUseRtl);
    I18nManager.forceRTL(shouldUseRtl);
  }
}

const deviceLocale = resolveDeviceLocale();
applyRtl(deviceLocale);

void i18n.use(initReactI18next).init({
  resources,
  lng: deviceLocale,
  fallbackLng: 'en',
  supportedLngs: [...SUPPORTED_LOCALES],
  interpolation: { escapeValue: false },
  compatibilityJSON: 'v4',
});

export default i18n;

export function isRtlLocale(locale = i18n.language): boolean {
  return locale === 'ar';
}
