import { Alert } from 'react-native';
import type { TFunction } from 'i18next';

export function promptSyncConflict(
  t: TFunction,
  onJump: () => void,
  onKeep: () => void,
): void {
  Alert.alert(t('sync.conflictTitle'), t('sync.conflictMessage'), [
    { text: t('sync.keep'), style: 'cancel', onPress: onKeep },
    { text: t('sync.jump'), onPress: onJump },
  ]);
}
