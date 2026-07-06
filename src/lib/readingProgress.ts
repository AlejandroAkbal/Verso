import type { Locator } from 'react-native-readium';

import type { ReadingProgressRow } from '@/db/schema';

const FINISHED_THRESHOLD = 0.98;

export function progressionFromLocator(locator: Locator): number {
  const locations = locator.locations;
  if (!locations) return 0;
  if (locations.totalProgression != null) return locations.totalProgression;
  if (locations.progression != null) return locations.progression;
  return 0;
}

export function parseStoredLocator(json: string): Locator | undefined {
  if (!json) return undefined;
  try {
    return JSON.parse(json) as Locator;
  } catch {
    return undefined;
  }
}

export function progressPercent(row: ReadingProgressRow | undefined): number | null {
  if (!row || row.progression <= 0) return null;
  return Math.min(100, Math.round(row.progression * 100));
}

export function isFinished(row: ReadingProgressRow | undefined): boolean {
  if (!row) return false;
  return row.progression >= FINISHED_THRESHOLD;
}

export function progressLabel(row: ReadingProgressRow | undefined): string | null {
  if (!row || row.progression <= 0) return null;
  if (isFinished(row)) return 'Finished';
  const percent = progressPercent(row);
  return percent != null && percent > 0 ? `${percent}%` : null;
}
