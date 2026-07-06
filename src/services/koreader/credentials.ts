import * as SecureStore from 'expo-secure-store';

import { appIdentity } from '@/config/appIdentity';
import { md5Hex } from '@/lib/md5';

import type { KoreaderAuthHeaders } from './types';

export function passwordToAuthKey(password: string): string {
  return md5Hex(password);
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

export async function buildAuthHeaders(
  username: string,
  password?: string | null,
): Promise<KoreaderAuthHeaders | null> {
  const effectivePassword = password ?? (await getKoreaderPassword());
  if (!username || !effectivePassword) {
    return null;
  }

  return {
    'X-Auth-User': username,
    'X-Auth-Key': passwordToAuthKey(effectivePassword),
  };
}
