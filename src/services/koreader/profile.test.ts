import { describe, expect, it } from 'vitest';

import { kosyncEndpoint, resolveKosyncProfile } from './profile';

describe('resolveKosyncProfile', () => {
  it('keeps legacy KOReader hosts on legacy auth without /kosync prefix', () => {
    expect(resolveKosyncProfile('https://sync.koreader.rocks')).toEqual({
      baseUrl: 'https://sync.koreader.rocks',
      apiPrefix: '',
      authMode: 'legacy',
    });
  });

  it('normalizes Calibre-Web Automated /kosync URLs to a basic-auth base plus prefix', () => {
    expect(resolveKosyncProfile('https://books.example.com/kosync/')).toEqual({
      baseUrl: 'https://books.example.com',
      apiPrefix: '/kosync',
      authMode: 'basic',
    });
  });

  it('preserves Calibre-Web base paths before the /kosync API prefix', () => {
    expect(resolveKosyncProfile('https://example.com/books/kosync')).toEqual({
      baseUrl: 'https://example.com/books',
      apiPrefix: '/kosync',
      authMode: 'basic',
    });
  });
});

describe('kosyncEndpoint', () => {
  it('joins normalized profile pieces with one path separator', () => {
    expect(
      kosyncEndpoint(
        { baseUrl: 'https://books.example.com', apiPrefix: '/kosync', authMode: 'basic' },
        'users/auth',
      ),
    ).toBe('https://books.example.com/kosync/users/auth');
  });
});
