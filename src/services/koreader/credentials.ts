import * as SecureStore from 'expo-secure-store';

import { appIdentity } from '@/config/appIdentity';
import { md5Hex } from '@/lib/md5';

import { resolveKosyncProfile } from './profile';
import type { KoreaderAuthHeaders } from './types';
import { KOREADER_ACCEPT } from './types';

export type KosyncAuth =
  | { mode: 'legacy'; headers: KoreaderAuthHeaders }
  | { mode: 'basic'; authorization: string };

export function passwordToAuthKey(password: string): string {
  return md5Hex(password);
}

function encodeBasicAuth(username: string, password: string): string {
  const credentials = `${username}:${password}`;
  const bytes = new TextEncoder().encode(credentials);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

export async function getKoreaderPassword(): Promise<string | null> {
  return SecureStore.getItemAsync(appIdentity.secureStoreKoreaderPasswordKey);
}

export async function setKoreaderPassword(password: string): Promise<void> {
  if (password) {
    await SecureStore.setItemAsync(appIdentity.secureStoreKoreaderPasswordKey, password);
  } else {
    await SecureStore.deleteItemAsync(appIdentity.secureStoreKoreaderPasswordKey);
  }
}

export async function deleteKoreaderPassword(): Promise<void> {
  await SecureStore.deleteItemAsync(appIdentity.secureStoreKoreaderPasswordKey);
}

export async function buildKosyncAuth(
  serverUrl: string,
  username: string,
  password?: string | null,
): Promise<KosyncAuth | null> {
  const effectivePassword = password ?? (await getKoreaderPassword());
  if (!username || !effectivePassword) {
    return null;
  }

  const profile = resolveKosyncProfile(serverUrl);
  if (profile.authMode === 'basic') {
    return {
      mode: 'basic',
      authorization: encodeBasicAuth(username.trim(), effectivePassword),
    };
  }

  return {
    mode: 'legacy',
    headers: {
      'X-Auth-User': username.trim(),
      'X-Auth-Key': passwordToAuthKey(effectivePassword),
    },
  };
}

/** @deprecated Use buildKosyncAuth — kept for call sites that only need legacy headers. */
export async function buildAuthHeaders(
  username: string,
  password?: string | null,
): Promise<KoreaderAuthHeaders | null> {
  const effectivePassword = password ?? (await getKoreaderPassword());
  if (!username || !effectivePassword) {
    return null;
  }

  return {
    'X-Auth-User': username.trim(),
    'X-Auth-Key': passwordToAuthKey(effectivePassword),
  };
}

export function kosyncRequestHeaders(auth: KosyncAuth): Record<string, string> {
  if (auth.mode === 'basic') {
    return {
      Accept: KOREADER_ACCEPT,
      Authorization: auth.authorization,
    };
  }

  return {
    Accept: KOREADER_ACCEPT,
    'X-Auth-User': auth.headers['X-Auth-User'],
    'X-Auth-Key': auth.headers['X-Auth-Key'],
  };
}
