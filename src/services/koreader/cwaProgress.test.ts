import { describe, expect, it } from 'vitest';

import { isSameOriginUrl } from './cwaProgressOrigin';

describe('CWA progress URL origin checks', () => {
  it('accepts same-origin absolute download URLs', () => {
    expect(
      isSameOriginUrl(
        'https://example.com/opds/download/1/epub/',
        'https://example.com/opds',
      ),
    ).toBe(true);
  });

  it('accepts same-origin relative download URLs', () => {
    expect(isSameOriginUrl('/opds/download/1/epub/', 'https://example.com/opds')).toBe(true);
  });

  it('rejects cross-origin download URLs', () => {
    expect(
      isSameOriginUrl(
        'https://evil.example/opds/download/1/epub/',
        'https://example.com/opds',
      ),
    ).toBe(false);
  });

  it('rejects invalid server URLs', () => {
    expect(isSameOriginUrl('/opds/download/1/epub/', 'not a url')).toBe(false);
  });
});
