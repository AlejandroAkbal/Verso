import { resolveBookListingUrl } from './catalog';
import i18n from '@/i18n';
import { fetchAllOPDSEntries, fetchOPDSFeed } from './parser';
import type { OpdsAuth } from './types';

export type OpdsConnectionResult = {
  ok: boolean;
  title?: string;
  entryCount?: number;
  error?: string;
};

export async function testOpdsConnection(
  url: string,
  auth: OpdsAuth | null,
): Promise<OpdsConnectionResult> {
  try {
    const rootFeed = await fetchOPDSFeed(url, auth);
    const listingUrl = await resolveBookListingUrl(url, auth);
    const { entries } = await fetchAllOPDSEntries(listingUrl, 1, auth);

    const entryCount = entries.length;
    const navigable =
      rootFeed.navigationEntries.length > 0 || rootFeed.entries.length > 0;

    if (entryCount > 0 || navigable) {
      return {
        ok: true,
        title: rootFeed.title,
        entryCount,
      };
    }

    return {
      ok: false,
      error: i18n.t('errors.noBooksFound'),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : i18n.t('errors.connectionFailed');
    if (message.includes('401') || message.includes('403')) {
      return { ok: false, error: i18n.t('errors.authFailed') };
    }
    return { ok: false, error: message };
  }
}
