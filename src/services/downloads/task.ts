import * as BackgroundTask from 'expo-background-task';
import * as Device from 'expo-device';
import * as TaskManager from 'expo-task-manager';
import type { SQLiteDatabase } from 'expo-sqlite';
import { openDatabaseSync } from 'expo-sqlite';

import { processDownloadQueue } from './queue';

export const BACKGROUND_DOWNLOAD_TASK = 'verso-background-download';

TaskManager.defineTask(BACKGROUND_DOWNLOAD_TASK, async () => {
  try {
    const db = openDatabaseSync('verso.db');
    await processDownloadQueue(db);
    return BackgroundTask.BackgroundTaskResult.Success;
  } catch {
    return BackgroundTask.BackgroundTaskResult.Failed;
  }
});

export async function registerBackgroundDownloadTask(): Promise<void> {
  if (!Device.isDevice) {
    return;
  }

  const isRegistered = await TaskManager.isTaskRegisteredAsync(
    BACKGROUND_DOWNLOAD_TASK,
  );

  if (!isRegistered) {
    await BackgroundTask.registerTaskAsync(BACKGROUND_DOWNLOAD_TASK, {
      minimumInterval: 15,
    });
  }
}

export async function triggerDownloadProcessing(db: SQLiteDatabase): Promise<void> {
  await processDownloadQueue(db);
}
