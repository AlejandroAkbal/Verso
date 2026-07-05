import type { ReadingProgressRow } from '@/db/schema';

export function progressPercent(row: ReadingProgressRow | undefined): number | null {
  if (!row || row.total <= 0) return null;

  const ratio = (row.position + 1) / row.total;
  if (ratio <= 0) return null;

  return Math.min(100, Math.round(ratio * 100));
}

export function isFinished(row: ReadingProgressRow | undefined): boolean {
  if (!row || row.total <= 0) return false;
  return row.position >= row.total - 1;
}

export function progressLabel(row: ReadingProgressRow | undefined): string | null {
  if (!row || row.total <= 0) return null;
  if (isFinished(row)) return 'Finished';
  const percent = progressPercent(row);
  return percent != null && percent > 0 ? `${percent}%` : null;
}
