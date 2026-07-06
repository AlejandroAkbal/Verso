import type { Locator } from 'react-native-readium';

import { appIdentity } from '@/config/appIdentity';

import type {
  KoreaderAuthHeaders,
  KoreaderProgressPayload,
  KoreaderProgressResponse,
} from './types';
import { KOREADER_ACCEPT } from './types';

function normalizeServerUrl(serverUrl: string): string {
  return serverUrl.replace(/\/$/, '');
}

function baseHeaders(auth: KoreaderAuthHeaders): Record<string, string> {
  return {
    Accept: KOREADER_ACCEPT,
    'X-Auth-User': auth['X-Auth-User'],
    'X-Auth-Key': auth['X-Auth-Key'],
  };
}

export async function testKoreaderConnection(
  serverUrl: string,
  auth: KoreaderAuthHeaders,
): Promise<void> {
  const response = await fetch(`${normalizeServerUrl(serverUrl)}/users/auth`, {
    method: 'GET',
    headers: baseHeaders(auth),
  });

  if (response.status === 401) {
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    throw new Error(`Connection failed (${response.status})`);
  }
}

export async function fetchRemoteProgress(
  serverUrl: string,
  auth: KoreaderAuthHeaders,
  documentId: string,
): Promise<KoreaderProgressResponse | null> {
  const response = await fetch(
    `${normalizeServerUrl(serverUrl)}/syncs/progress/${documentId}`,
    {
      method: 'GET',
      headers: baseHeaders(auth),
    },
  );

  if (response.status === 404) {
    return null;
  }

  if (response.status === 401) {
    throw new Error('Authentication failed');
  }

  if (!response.ok) {
    throw new Error(`Sync fetch failed (${response.status})`);
  }

  return (await response.json()) as KoreaderProgressResponse;
}

export async function pushRemoteProgress(
  serverUrl: string,
  auth: KoreaderAuthHeaders,
  payload: KoreaderProgressPayload,
): Promise<KoreaderProgressResponse> {
  const response = await fetch(`${normalizeServerUrl(serverUrl)}/syncs/progress`, {
    method: 'PUT',
    headers: {
      ...baseHeaders(auth),
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
    throw new Error(`Sync push failed (${response.status})`);
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
  remote: KoreaderProgressResponse,
): boolean {
  const remoteMs = remote.timestamp * 1000;
  if (remoteMs <= localUpdatedAt) {
    return false;
  }
  return Math.abs(remote.percentage - localProgression) >= 0.02;
}
