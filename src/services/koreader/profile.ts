const LEGACY_KOSYNC_HOSTS = ['sync.koreader.rocks', 'kosync.koreader.rocks'];

export type KosyncAuthMode = 'legacy' | 'basic';

export type KosyncProfile = {
  /** Origin (+ optional path) without a trailing `/kosync` suffix. */
  baseUrl: string;
  /** `/kosync` for Calibre-Web Automated; empty for legacy public servers. */
  apiPrefix: '' | '/kosync';
  authMode: KosyncAuthMode;
};

function isLegacyKosyncHost(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  return LEGACY_KOSYNC_HOSTS.some(
    (host) => normalized === host || normalized.endsWith(`.${host}`),
  );
}

/**
 * Normalize a user-entered sync server URL into a stable base + API prefix.
 *
 * - Legacy KOReader sync (e.g. sync.koreader.rocks): X-Auth headers, `/users/auth`.
 * - Calibre-Web Automated: HTTP Basic Auth, `/kosync/users/auth` (base URL has no `/kosync` suffix).
 */
export function resolveKosyncProfile(serverUrl: string): KosyncProfile {
  let trimmed = serverUrl.trim().replace(/\/+$/, '');
  if (!trimmed) {
    return { baseUrl: '', apiPrefix: '/kosync', authMode: 'basic' };
  }

  if (trimmed.endsWith('/kosync')) {
    trimmed = trimmed.slice(0, -'/kosync'.length).replace(/\/+$/, '');
  }

  let hostname = '';
  try {
    hostname = new URL(trimmed).hostname;
  } catch {
    return { baseUrl: trimmed, apiPrefix: '/kosync', authMode: 'basic' };
  }

  if (isLegacyKosyncHost(hostname)) {
    return { baseUrl: trimmed, apiPrefix: '', authMode: 'legacy' };
  }

  try {
    const parsed = new URL(trimmed);
    const baseUrl =
      parsed.pathname === '/' || parsed.pathname === ''
        ? parsed.origin
        : trimmed.replace(/\/+$/, '');
    return { baseUrl, apiPrefix: '/kosync', authMode: 'basic' };
  } catch {
    return { baseUrl: trimmed, apiPrefix: '/kosync', authMode: 'basic' };
  }
}

export function kosyncEndpoint(profile: KosyncProfile, path: string): string {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${profile.baseUrl}${profile.apiPrefix}${normalizedPath}`;
}
