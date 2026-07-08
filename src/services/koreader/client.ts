import type { Locator } from 'react-native-readium';

import { appIdentity } from '@/config/appIdentity';

import {
  buildKosyncAuth,
  kosyncRequestHeaders,
} from './credentials';
import { kosyncEndpoint, resolveKosyncProfile } from './profile';
import { normalizeRemotePercentage } from './progress';
import type {
  KoreaderProgressPayload,
  KoreaderProgressResponse,
  KoreaderProgressResponse as KoreaderProgressResponseType,
} from './types';

/**
 * KOSync servers (incl. Calibre-Web Automated) return actionable JSON errors,
 * e.g. `{"error":1000,"message":"KOReader sync is disabled"}` on a 503. Surface
 * that message instead of a bare status code so the user knows what to fix.
 */
async function readKosyncErrorMessage(response: Response): Promise<string | null> {
  try {
    const text = await response.text();
    if (!text) {
      return null;
    }
    const data = JSON.parse(text) as { message?: unknown };
    if (typeof data?.message === 'string' && data.message.trim()) {
      return data.message.trim();
    }
  } catch {
    // Non-JSON body — fall back to the status-code message.
  }
  return null;
}

export async function testKoreaderConnection(
  serverUrl: string,
  username: string,
  password?: string | null,
): Promise<void> {
  const profile = resolveKosyncProfile(serverUrl);
  const auth = await buildKosyncAuth(serverUrl, username, password);
  if (!auth) {
    throw new Error('Missing credentials');
  }

  const response = await fetch(kosyncEndpoint(profile, '/users/auth'), {
    method: 'GET',
    headers: kosyncRequestHeaders(auth),
  });

  if (response.status === 401) {
    throw new Error(
      profile.authMode === 'basic'
        ? 'Authentication failed — check your Calibre-Web username and password'
        : 'Authentication failed',
    );
  }

  if (!response.ok) {
    const serverMessage = await readKosyncErrorMessage(response);
    if (serverMessage) {
      throw new Error(serverMessage);
    }
    const suffix =
      profile.authMode === 'basic' && response.status === 404
        ? ' — is KOReader sync enabled on your server?'
        : '';
    throw new Error(`Connection failed (${response.status})${suffix}`);
  }
}

export async function fetchRemoteProgress(
  serverUrl: string,
  username: string,
  documentId: string,
  password?: string | null,
): Promise<KoreaderProgressResponse | null> {
  const profile = resolveKosyncProfile(serverUrl);
  const auth = await buildKosyncAuth(serverUrl, username, password);
  if (!auth) {
    throw new Error('Missing credentials');
  }

  const response = await fetch(
    kosyncEndpoint(profile, `/syncs/progress/${encodeURIComponent(documentId)}`),
    {
      method: 'GET',
      headers: kosyncRequestHeaders(auth),
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (response.status === 401) {
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const serverMessage = await readKosyncErrorMessage(response);
    throw new Error(serverMessage ?? `Sync fetch failed (${response.status})`);
  }

  return (await response.json()) as KoreaderProgressResponse;
}

export async function pushRemoteProgress(
  serverUrl: string,
  username: string,
  payload: KoreaderProgressPayload,
  password?: string | null,
): Promise<KoreaderProgressResponse> {
  const profile = resolveKosyncProfile(serverUrl);
  const auth = await buildKosyncAuth(serverUrl, username, password);
  if (!auth) {
    throw new Error('Missing credentials');
  }

  const response = await fetch(kosyncEndpoint(profile, '/syncs/progress'), {
    method: 'PUT',
    headers: {
      ...kosyncRequestHeaders(auth),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      ...payload,
      device: appIdentity.displayName,
    }),
  });

  if (response.status === 401) {
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    const serverMessage = await readKosyncErrorMessage(response);
    throw new Error(serverMessage ?? `Sync push failed (${response.status})`);
  }

  return (await response.json()) as KoreaderProgressResponse;
}

export function progressionToProgressString(
  progression: number,
  positionCount?: number,
): string {
  if (positionCount && positionCount > 1) {
    return String(Math.round(progression * (positionCount - 1)));
  }
  return String(Math.round(progression * 10_000));
}

export function percentageToLocator(percentage: number): Locator {
  const clamped = Math.min(1, Math.max(0, percentage));
  return {
    href: '',
    type: 'application/xhtml+xml',
    locations: {
      progression: clamped,
      totalProgression: clamped,
    },
  };
}

export function hasSyncConflict(
  localUpdatedAt: number,
  localProgression: number,
  remote: KoreaderProgressResponseType,
): boolean {
  const remoteMs = remote.timestamp * 1000;
  if (remoteMs <= localUpdatedAt) {
    return false;
  }
  return Math.abs(normalizeRemotePercentage(remote.percentage) - localProgression) >= 0.02;
}
