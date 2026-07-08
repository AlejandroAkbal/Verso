import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

import { appIdentity } from '@/config/appIdentity';

export async function getOrCreateKoreaderDeviceId(): Promise<string> {
  const existing = await AsyncStorage.getItem(appIdentity.koreaderDeviceIdStorageKey);
  if (existing) {
    return existing;
  }

  const uuid = await Crypto.randomUUID();
  const deviceId = uuid.replace(/-/g, '').toUpperCase();
  await AsyncStorage.setItem(appIdentity.koreaderDeviceIdStorageKey, deviceId);
  return deviceId;
}

export async function deleteKoreaderDeviceId(): Promise<void> {
  await AsyncStorage.removeItem(appIdentity.koreaderDeviceIdStorageKey);
}
