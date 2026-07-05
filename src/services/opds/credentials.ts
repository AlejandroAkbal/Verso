import * as SecureStore from 'expo-secure-store';

import type { OpdsAuth } from './types';

const PASSWORD_PREFIX = 'verso.server.password.';

export async function getServerPassword(serverId: string): Promise<string | null> {
  return SecureStore.getItemAsync(`${PASSWORD_PREFIX}${serverId}`);
}

export async function setServerPassword(
  serverId: string,
  password: string,
): Promise<void> {
  if (password) {
    await SecureStore.setItemAsync(`${PASSWORD_PREFIX}${serverId}`, password);
  } else {
    await SecureStore.deleteItemAsync(`${PASSWORD_PREFIX}${serverId}`);
  }
}

export async function deleteServerPassword(serverId: string): Promise<void> {
  await SecureStore.deleteItemAsync(`${PASSWORD_PREFIX}${serverId}`);
}

export async function getServerAuth(
  serverId: string,
  username: string,
): Promise<OpdsAuth | null> {
  if (!username) {
    return null;
  }

  const password = await getServerPassword(serverId);
  if (!password) {
    return null;
  }

  return { username, password };
}

export function authToHeaders(auth: OpdsAuth | null): Record<string, string> {
  if (!auth) {
    return {};
  }

  const credentials = `${auth.username}:${auth.password}`;
  const bytes = new TextEncoder().encode(credentials);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return { Authorization: `Basic ${btoa(binary)}` };
}
