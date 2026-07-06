import type { TFunction } from 'i18next';

/** Map raw download errors to actionable user-facing copy. */
export function formatDownloadError(t: TFunction, raw: string): string {
  const message = raw.trim();
  if (!message) {
    return t('downloads.errorUnknown');
  }

  const lower = message.toLowerCase();

  if (lower.includes('401') || lower.includes('authentication') || lower.includes('unauthorized')) {
    return t('downloads.errorAuth');
  }

  if (lower.includes('403') || lower.includes('forbidden')) {
    return t('downloads.errorForbidden');
  }

  if (lower.includes('404') || lower.includes('not found')) {
    return t('downloads.errorNotFound');
  }

  if (lower.includes('opds fetch failed') || lower.includes('non-xml')) {
    return t('downloads.errorOpds');
  }

  if (lower.includes('no download link')) {
    return t('downloads.errorNoLink');
  }

  if (lower.includes('arraybuffer') || lower.includes('blob')) {
    return t('downloads.errorTransport');
  }

  if (/download failed \(\d{3}\)/i.test(message) || /unabletodownload/i.test(message)) {
    return t('downloads.errorHttp', { detail: message });
  }

  return t('downloads.errorGeneric', { detail: message });
}
