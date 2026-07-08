import { describe, expect, it, vi } from 'vitest';

import { entriesToBookRows, parseOPDSFeed } from './parser';

vi.mock('expo-crypto', () => ({
  CryptoDigestAlgorithm: { SHA256: 'SHA-256' },
  digestStringAsync: vi.fn(async () => '0'.repeat(64)),
}));

describe('parseOPDSFeed', () => {
  it('maps acquisition links to download metadata', () => {
    const feed = parseOPDSFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <title>Catalog</title>
        <entry>
          <id>book-1</id>
          <title>Book One</title>
          <author><name>Author One</name></author>
          <link rel="http://opds-spec.org/acquisition" href="books/book-one.epub" type="application/epub+zip" />
        </entry>
      </feed>
    `, 'https://example.com/opds/index.xml');

    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0]).toMatchObject({
      id: 'book-1',
      downloadUrl: 'https://example.com/opds/books/book-one.epub',
      mime: 'application/epub+zip',
    });
  });

  it('preserves subsection OPDS detail entries for later acquisition resolution', () => {
    const feed = parseOPDSFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>https://example.com/books/2.opds</id>
          <title>Detail Book</title>
          <author><name>Author Two</name></author>
          <link rel="subsection" href="/books/2.opds" type="application/atom+xml;profile=opds-catalog" />
        </entry>
      </feed>
    `, 'https://example.com/opds/index.xml');

    expect(feed.entries).toHaveLength(1);
    expect(feed.entries[0]).toMatchObject({
      downloadUrl: 'https://example.com/books/2.opds',
      mime: 'application/atom+xml;profile=opds-catalog',
    });
  });

  it('serializes stable category arrays when converted to BookRow', async () => {
    const feed = parseOPDSFeed(`
      <feed xmlns="http://www.w3.org/2005/Atom">
        <entry>
          <id>book-3</id>
          <title>Book Three</title>
          <category term="fiction" label="Fiction" />
          <category term="classic" />
          <category term="fiction" label="Fiction" />
          <link rel="http://opds-spec.org/acquisition" href="book-three.epub" type="application/epub+zip" />
        </entry>
      </feed>
    `, 'https://example.com/opds/index.xml');

    const rows = await entriesToBookRows(feed.entries, 'server-1');

    expect(rows[0].categories).toBe(JSON.stringify(['Fiction', 'classic']));
  });
});
