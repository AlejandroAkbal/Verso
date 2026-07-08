import { describe, expect, it } from 'vitest';

import { deriveKosyncUrlFromOpdsUrl, deriveServerTitle, normalizeOpdsUrl } from './url';

describe('normalizeOpdsUrl', () => {
  it('adds https and /opds for bare hosts', () => {
    expect(normalizeOpdsUrl('books.example.com')).toBe('https://books.example.com/opds');
  });

  it('preserves existing OPDS paths without trailing slashes', () => {
    expect(normalizeOpdsUrl('https://books.example.com/custom/opds/')).toBe(
      'https://books.example.com/custom/opds',
    );
  });
});

describe('deriveKosyncUrlFromOpdsUrl', () => {
  it('returns the server root for root OPDS feeds', () => {
    expect(deriveKosyncUrlFromOpdsUrl('https://books.example.com/opds')).toBe(
      'https://books.example.com',
    );
  });

  it('preserves subpaths before /opds or /kosync', () => {
    expect(deriveKosyncUrlFromOpdsUrl('https://example.com/books/opds')).toBe(
      'https://example.com/books',
    );
    expect(deriveKosyncUrlFromOpdsUrl('https://example.com/books/kosync')).toBe(
      'https://example.com/books',
    );
  });
});

describe('deriveServerTitle', () => {
  it('prefers non-generic feed titles', () => {
    expect(deriveServerTitle('https://books.example.com/opds', 'Personal Library')).toBe(
      'Personal Library',
    );
  });

  it('falls back to a readable host label for generic catalog titles', () => {
    expect(deriveServerTitle('https://books.example.com/opds', 'Catalog')).toBe('Books');
  });
});
