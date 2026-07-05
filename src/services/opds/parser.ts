import { XMLParser } from 'fast-xml-parser';
import * as Crypto from 'expo-crypto';

import type { BookRow } from '@/db/schema';
import type { OPDSEntry, OPDSFeed } from './types';

type XmlPrimitive = string | number | boolean;
interface XmlNode {
  [key: string]: XmlPrimitive | XmlNode | XmlNode[] | undefined;
}

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
  const acquisition = links.find((link) => {
    const rel = asString(link['@_rel']);
    return rel.includes('acquisition') || rel.includes('http://opds-spec.org/acquisition');
  });

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

function resolveHref(href: string, baseUrl?: string): string {
  if (!href) return '';
  if (href.startsWith('http://') || href.startsWith('https://')) return href;
  if (baseUrl) {
    try {
      return new URL(href, baseUrl).href;
    } catch {
      return href;
    }
  }
  return href;
}

function parseEntry(entry: XmlNode, baseUrl: string): OPDSEntry | null {
  const title = asString(entry.title);
  if (!title) return null;

  const links = extractLinks(entry);
  const { url: downloadUrl, mime } = extractDownloadLink(links);
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
  };
}

export function parseOPDSFeed(xml: string, feedUrl: string): OPDSFeed {
  const parsed = parser.parse(xml) as XmlNode;
  const feed = (parsed.feed ?? parsed['catalog'] ?? parsed) as XmlNode;

  const entries = asArray(feed.entry as XmlNode | XmlNode[])
    .map((entry) => parseEntry(entry, feedUrl))
    .filter((entry): entry is OPDSEntry => entry !== null);

  const links = asArray(feed.link as XmlNode | XmlNode[]);
  const nextLink = links.find((link) => {
    const rel = asString(link['@_rel']);
    return rel === 'next' || rel.includes('next');
  });

  return {
    title: asString(feed.title) || 'Catalog',
    entries,
    nextUrl: nextLink ? resolveHref(asString(nextLink['@_href']), feedUrl) : null,
  };
}

export async function fetchOPDSFeed(url: string): Promise<OPDSFeed> {
  const response = await fetch(url, {
    headers: {
      Accept: 'application/atom+xml, application/xml, text/xml, */*',
    },
  });

  if (!response.ok) {
    throw new Error(`OPDS fetch failed: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();
  return parseOPDSFeed(xml, url);
}

export async function fetchAllOPDSEntries(
  startUrl: string,
  maxPages = 3,
): Promise<OPDSEntry[]> {
  const allEntries: OPDSEntry[] = [];
  let currentUrl: string | null = startUrl;
  let page = 0;

  while (currentUrl && page < maxPages) {
    const feed = await fetchOPDSFeed(currentUrl);
    allEntries.push(...feed.entries);
    currentUrl = feed.nextUrl;
    page += 1;
  }

  const seen = new Set<string>();
  return allEntries.filter((entry) => {
    if (seen.has(entry.id)) return false;
    seen.add(entry.id);
    return true;
  });
}

export async function createBookId(serverId: string, opdsId: string): Promise<string> {
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
    });
  }

  return rows;
}
