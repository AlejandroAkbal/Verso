import { XMLParser } from 'fast-xml-parser';

import type { BookRow } from '@/db/schema';
import type { OPDSEntry, OPDSFeed, OPDSNavigationEntry, OpdsAuth } from './types';

type XmlPrimitive = string | number | boolean;
interface XmlNode {
  [key: string]: XmlPrimitive | XmlNode | XmlNode[] | undefined;
}

const OPDS_FETCH_TIMEOUT_MS = 30_000;
const OPDS_PAGINATION_TIMEOUT_MS = 120_000;

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
  trimValues: true,
  isArray: (name: string) =>
    ['entry', 'author', 'link', 'category'].includes(name),
});

function asArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function asString(value: XmlPrimitive | XmlNode | XmlNode[] | undefined): string {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value.trim();
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (typeof value === 'object' && '#text' in value) {
    return asString(value['#text']);
  }
  return '';
}

function extractAuthors(entry: XmlNode): string {
  const authors = asArray(entry.author as XmlNode | XmlNode[]);
  const names = authors
    .map((author) => asString(author.name))
    .filter(Boolean);
  return names.join(', ');
}

function extractLinks(entry: XmlNode): XmlNode[] {
  return asArray(entry.link as XmlNode | XmlNode[]);
}

function extractCategories(entry: XmlNode): string[] {
  const categories = asArray(entry.category as XmlNode | XmlNode[]);
  const labels = categories
    .map((category) => asString(category['@_label']) || asString(category['@_term']))
    .filter(Boolean);
  return [...new Set(labels)];
}

function isAcquisitionLink(link: XmlNode): boolean {
  const rel = asString(link['@_rel']);
  return rel.includes('acquisition') || rel.includes('http://opds-spec.org/acquisition');
}

function isNavigationLink(link: XmlNode): boolean {
  const rel = asString(link['@_rel']);
  return rel === 'subsection' || rel.includes('subsection');
}

function extractCoverUrl(links: XmlNode[]): string {
  const imageLink = links.find((link) => {
    const rel = asString(link['@_rel']);
    const type = asString(link['@_type']);
    return (
      rel.includes('image') ||
      rel.includes('cover') ||
      type.startsWith('image/')
    );
  });
  if (imageLink) {
    return asString(imageLink['@_href']);
  }
  const thumbnail = links.find((link) =>
    asString(link['@_rel']).includes('thumbnail'),
  );
  return thumbnail ? asString(thumbnail['@_href']) : '';
}

function extractDownloadLink(links: XmlNode[]): { url: string; mime: string } {
  const acquisitions = links.filter(isAcquisitionLink);

  const preferred = acquisitions.find((link) => {
    const href = asString(link['@_href']);
    const type = asString(link['@_type']);
    return (
      (type.includes('epub') || href.endsWith('.epub')) &&
      !href.includes('kepub')
    );
  });

  const acquisition = preferred ?? acquisitions[0];

  if (acquisition) {
    return {
      url: resolveHref(asString(acquisition['@_href'])),
      mime: asString(acquisition['@_type']),
    };
  }

  const epub = links.find((link) => {
    const type = asString(link['@_type']);
    const href = asString(link['@_href']);
    return (
      type.includes('epub') ||
      href.endsWith('.epub') ||
      type === 'application/epub+zip'
    );
  });

  if (epub) {
    return {
      url: resolveHref(asString(epub['@_href'])),
      mime: asString(epub['@_type']) || 'application/epub+zip',
    };
  }

  return { url: '', mime: '' };
}

function extractNavigationHref(links: XmlNode[]): string {
  const navLink = links.find(isNavigationLink);
  if (navLink) {
    return asString(navLink['@_href']);
  }

  const catalogLink = links.find((link) => {
    const type = asString(link['@_type']);
    return type.includes('opds-catalog') && !isAcquisitionLink(link);
  });

  return catalogLink ? asString(catalogLink['@_href']) : '';
}

export function resolveHref(href: string, baseUrl?: string): string {
  if (!href) return '';
  if (
    href.startsWith('http://') ||
    href.startsWith('https://') ||
    href.startsWith('data:')
  ) {
    return href;
  }
  if (baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }
  return href;
}

export function isOpdsCatalogReference(url: string, mime: string): boolean {
  if (!url) return false;
  if (mime.includes('opds-catalog')) return true;
  return /\.opds(\?|$)/i.test(url);
}

function isCatalogBookEntry(entry: XmlNode, links: XmlNode[]): boolean {
  if (!links.some(isNavigationLink)) return false;

  const title = asString(entry.title);
  if (!title) return false;

  const id = asString(entry.id);
  if (id.endsWith('.opds')) return true;
  if (extractAuthors(entry)) return true;

  return false;
}

function parseCatalogBookEntry(entry: XmlNode, baseUrl: string): OPDSEntry | null {
  const title = asString(entry.title);
  const links = extractLinks(entry);
  if (!isCatalogBookEntry(entry, links)) return null;

  const subsection = links.find(isNavigationLink);
  if (!subsection) return null;

  const detailUrl = resolveHref(asString(subsection['@_href']), baseUrl);
  if (!detailUrl) return null;

  const coverRaw = extractCoverUrl(links);
  const id =
    asString(entry.id) ||
    detailUrl ||
    `${title}-${asString(entry.updated)}`;

  return {
    id,
    title,
    author: extractAuthors(entry),
    summary: asString(entry.summary) || asString(entry.content),
    coverUrl: resolveHref(coverRaw, baseUrl),
    downloadUrl: detailUrl,
    mime: 'application/atom+xml;profile=opds-catalog',
    updated: asString(entry.updated),
    categories: extractCategories(entry),
  };
}

export async function resolveAcquisitionFromDetail(
  detailUrl: string,
  auth: OpdsAuth | null = null,
): Promise<{ url: string; mime: string }> {
  const feed = await fetchOPDSFeed(detailUrl, auth);

  const epubs = feed.entries.filter(
    (entry) =>
      entry.downloadUrl &&
      (entry.mime.includes('epub') || entry.downloadUrl.endsWith('.epub')) &&
      !entry.downloadUrl.includes('kepub'),
  );
  if (epubs.length > 0) {
    return { url: epubs[0].downloadUrl, mime: epubs[0].mime };
  }

  const acquisition = feed.entries.find((entry) => entry.downloadUrl);
  if (acquisition) {
    return { url: acquisition.downloadUrl, mime: acquisition.mime };
  }

  throw new Error('No download link found in OPDS detail feed');
}

function parseAcquisitionEntry(entry: XmlNode, baseUrl: string): OPDSEntry | null {
  const title = asString(entry.title);
  if (!title) return null;

  const links = extractLinks(entry);
  const { url: downloadUrl, mime } = extractDownloadLink(links);
  if (!downloadUrl) return null;

  const coverRaw = extractCoverUrl(links);

  const id =
    asString(entry.id) ||
    asString(entry['@_id']) ||
    downloadUrl ||
    `${title}-${asString(entry.updated)}`;

  return {
    id,
    title,
    author: extractAuthors(entry),
    summary: asString(entry.summary) || asString(entry.content),
    coverUrl: resolveHref(coverRaw, baseUrl),
    downloadUrl: resolveHref(downloadUrl, baseUrl),
    mime,
    updated: asString(entry.updated),
    categories: extractCategories(entry),
  };
}

function parseNavigationEntry(entry: XmlNode, baseUrl: string): OPDSNavigationEntry | null {
  const title = asString(entry.title);
  const links = extractLinks(entry);
  const href = resolveHref(extractNavigationHref(links), baseUrl);
  if (!title || !href) return null;
  return { title, href };
}

function extractSearchUrl(links: XmlNode[], baseUrl: string): string | null {
  const searchLink = links.find((link) => {
    const rel = asString(link['@_rel']);
    const type = asString(link['@_type']);
    return rel === 'search' && type.includes('atom+xml');
  });

  if (!searchLink) return null;

  const href = asString(searchLink['@_href']);
  if (!href) return null;

  return resolveHref(href, baseUrl);
}

export function parseOPDSFeed(xml: string, feedUrl: string): OPDSFeed {
  const parsed = parser.parse(xml) as XmlNode;
  const feed = (parsed.feed ?? parsed['catalog'] ?? parsed) as XmlNode;

  const rawEntries = asArray(feed.entry as XmlNode | XmlNode[]);
  const entries: OPDSEntry[] = [];
  const navigationEntries: OPDSNavigationEntry[] = [];

  for (const entry of rawEntries) {
    const book = parseAcquisitionEntry(entry, feedUrl);
    if (book) {
      entries.push(book);
      continue;
    }

    const catalogBook = parseCatalogBookEntry(entry, feedUrl);
    if (catalogBook) {
      entries.push(catalogBook);
      continue;
    }

    const nav = parseNavigationEntry(entry, feedUrl);
    if (nav) {
      navigationEntries.push(nav);
    }
  }

  const links = asArray(feed.link as XmlNode | XmlNode[]);
  const nextLink = links.find((link) => {
    const rel = asString(link['@_rel']);
    return rel === 'next' || rel.includes('next');
  });

  return {
    title: asString(feed.title) || 'Catalog',
    entries,
    navigationEntries,
    nextUrl: nextLink ? resolveHref(asString(nextLink['@_href']), feedUrl) : null,
    searchUrl: extractSearchUrl(links, feedUrl),
  };
}

function createTimeoutSignal(ms: number): AbortSignal {
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export async function fetchOPDSFeed(url: string, auth: OpdsAuth | null = null): Promise<OPDSFeed> {
  const { authToHeaders } = await import('./credentials');
  let response: Response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/atom+xml, application/xml, text/xml, */*',
        ...authToHeaders(auth),
      },
      redirect: 'follow',
      signal: createTimeoutSignal(OPDS_FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    if (isAbortError(error)) {
      throw new Error('OPDS request timed out');
    }
    throw error;
  }

  if (!response.ok) {
    throw new Error(`OPDS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  const trimmed = xml.trimStart();

  if (!trimmed.startsWith('<?xml') && !trimmed.startsWith('<feed')) {
    throw new Error('OPDS fetch returned non-XML response');
  }

  const feedUrl = response.url || url;
  return parseOPDSFeed(xml, feedUrl);
}

export async function fetchAllOPDSEntries(
  startUrl: string,
  maxPages = 50,
  auth: OpdsAuth | null = null,
): Promise<{ entries: OPDSEntry[]; searchUrl: string | null }> {
  const allEntries: OPDSEntry[] = [];
  let searchUrl: string | null = null;
  let currentUrl: string | null = startUrl;
  let page = 0;
  const deadline = Date.now() + OPDS_PAGINATION_TIMEOUT_MS;

  while (currentUrl && page < maxPages) {
    if (Date.now() > deadline) {
      throw new Error('OPDS pagination timed out');
    }
    const feed = await fetchOPDSFeed(currentUrl, auth);
    if (!searchUrl && feed.searchUrl) {
      searchUrl = feed.searchUrl;
    }
    allEntries.push(...feed.entries);
    currentUrl = feed.nextUrl;
    page += 1;
  }

  const seen = new Set<string>();
  const entries = allEntries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });

  return { entries, searchUrl };
}

export async function searchOPDSEntries(
  searchUrlTemplate: string,
  query: string,
  baseUrl: string,
  auth: OpdsAuth | null = null,
  maxPages = 5,
): Promise<OPDSEntry[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];

  const encoded = encodeURIComponent(trimmed);
  const searchUrl = searchUrlTemplate.includes('{searchTerms}')
    ? searchUrlTemplate.replace('{searchTerms}', encoded)
    : `${searchUrlTemplate}${searchUrlTemplate.includes('?') ? '&' : '?'}query=${encoded}`;

  const absoluteUrl = resolveHref(searchUrl, baseUrl);
  const { entries } = await fetchAllOPDSEntries(absoluteUrl, maxPages, auth);
  return entries;
}

export async function createBookId(serverId: string, opdsId: string): Promise<string> {
  const Crypto = await import('expo-crypto');
  const digest = await Crypto.digestStringAsync(
    Crypto.CryptoDigestAlgorithm.SHA256,
    `${serverId}:${opdsId}`,
  );
  return digest.slice(0, 32);
}

export async function entriesToBookRows(
  entries: OPDSEntry[],
  serverId: string,
): Promise<BookRow[]> {
  const now = Date.now();
  const rows: BookRow[] = [];

  for (const entry of entries) {
    const bookId = await createBookId(serverId, entry.id);
    rows.push({
      id: bookId,
      server_id: serverId,
      opds_id: entry.id,
      title: entry.title,
      author: entry.author,
      summary: entry.summary,
      cover_url: entry.coverUrl,
      blurhash: '',
      download_url: entry.downloadUrl,
      mime: entry.mime,
      updated_at: entry.updated,
      cached_at: now,
      categories: JSON.stringify(entry.categories),
    });
  }

  return rows;
}
