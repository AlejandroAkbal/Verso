import { describe, expect, it } from 'vitest';

import { chooseSyncAccountSource } from './account';

describe('chooseSyncAccountSource', () => {
  it('keeps saved global account ahead of active-library CWA shortcut', () => {
    expect(
      chooseSyncAccountSource(
        { serverUrl: 'https://sync.example.com', username: 'global', hasPassword: true },
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: true },
      ),
    ).toEqual({ kind: 'saved', serverUrl: 'https://sync.example.com', username: 'global' });
  });

  it('uses active-library CWA shortcut only when no saved global account exists', () => {
    expect(
      chooseSyncAccountSource(
        null,
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: true },
      ),
    ).toEqual({
      kind: 'setup-shortcut',
      serverUrl: 'https://cwa.example.com/kosync',
      username: 'library',
    });
  });

  it('returns null when saved global account exists without password even if setup shortcut is ready', () => {
    expect(
      chooseSyncAccountSource(
        { serverUrl: 'https://sync.example.com', username: 'global', hasPassword: false },
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: true },
      ),
    ).toBeNull();
  });

  it('returns null when neither source has password-backed credentials', () => {
    expect(
      chooseSyncAccountSource(
        { serverUrl: 'https://sync.example.com', username: 'global', hasPassword: false },
        { serverUrl: 'https://cwa.example.com/kosync', username: 'library', hasPassword: false },
      ),
    ).toBeNull();
  });
});
