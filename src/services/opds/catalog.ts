import { fetchOPDSFeed, resolveHref } from './parser';
import type { OpdsAuth } from './types';

const BOOK_LISTING_TITLES = [
  /^alphabetical books$/i,
  /^all books$/i,
  /^books$/i,
  /^recently added books$/i,
];

const MAX_NAV_DEPTH = 5;
const MAX_NAV_BRANCHES = 40;

/**
 * OPDS root feeds (Calibre-Web, etc.) are often navigation-only.
 * Walk subsection links until we find a paginated acquisition listing.
 */
export async function resolveBookListingUrl(
  startUrl: string,
  auth: OpdsAuth | null,
): Promise<string> {
  const visited = new Set<string>();

  async function walk(url: string, depth: number): Promise<string | null> {
    if (visited.has(url) || depth > MAX_NAV_DEPTH) return null;
    visited.add(url);

    const feed = await fetchOPDSFeed(url, auth);
    if (feed.entries.length > 0) {
      return url;
    }

    const preferred = feed.navigationEntries.filter((entry) =>
      BOOK_LISTING_TITLES.some((pattern) => pattern.test(entry.title)),
    );

    const allBucket = feed.navigationEntries.find(
      (entry) => entry.title === 'All',
    );

    const candidates = [
      ...preferred,
      ...(allBucket ? [allBucket] : []),
      ...feed.navigationEntries,
    ].slice(0, MAX_NAV_BRANCHES);

    for (const entry of candidates) {
      const childUrl = resolveHref(entry.href, url);
      const resolved = await walk(childUrl, depth + 1);
      if (resolved) return resolved;
    }

    return null;
  }

  const resolved = await walk(startUrl, 0);
  return resolved ?? startUrl;
}
