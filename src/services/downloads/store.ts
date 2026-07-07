import type { SQLiteDatabase } from 'expo-sqlite';

import { getAllDownloads } from '@/db/queries';
import type { DownloadRow } from '@/db/schema';

import { subscribeDownloadsChanged } from './changes';

/**
 * Single source of truth for download rows, shared by every `useDownloads` /
 * `useDownloadStatus` consumer through `useSyncExternalStore`.
 *
 * - State transitions (enqueue / complete / fail / cancel / remove) arrive
 *   instantly via the `changes` pub/sub hub.
 * - Progress writes do NOT notify (queue only writes them to SQLite), so we
 *   poll — but ONLY while a download is actually in-flight. Idle = no timers.
 *
 * This replaces the previous per-hook unconditional 300ms polling loops.
 */

const ACTIVE_POLL_MS = 400;

let db: SQLiteDatabase | null = null;
let rows: DownloadRow[] = [];
let refreshing = false;
let refreshQueued = false;
let pollTimer: ReturnType<typeof setInterval> | null = null;
let changesUnsub: (() => void) | null = null;
const listeners = new Set<() => void>();

function isActive(row: DownloadRow): boolean {
  return row.status === 'queued' || row.status === 'downloading';
}

/** Reference stays stable when nothing meaningful changed (useSyncExternalStore). */
function rowsEqual(a: DownloadRow[], b: DownloadRow[]): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i];
    const y = b[i];
    if (
      x.book_id !== y.book_id ||
      x.status !== y.status ||
      x.progress !== y.progress ||
      x.bytes_written !== y.bytes_written ||
      x.bytes_total !== y.bytes_total ||
      x.local_uri !== y.local_uri ||
      x.error !== y.error
    ) {
      return false;
    }
  }
  return true;
}

function emit(): void {
  for (const listener of listeners) listener();
}

function syncPolling(): void {
  const active = rows.some(isActive);
  if (active && pollTimer === null) {
    pollTimer = setInterval(() => {
      void refresh();
    }, ACTIVE_POLL_MS);
  } else if (!active && pollTimer !== null) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

async function refresh(): Promise<void> {
  if (!db) return;
  if (refreshing) {
    refreshQueued = true;
    return;
  }
  refreshing = true;
  try {
    const next = await getAllDownloads(db);
    if (!rowsEqual(rows, next)) {
      rows = next;
      emit();
    }
    syncPolling();
  } finally {
    refreshing = false;
    if (refreshQueued) {
      refreshQueued = false;
      void refresh();
    }
  }
}

/** Bind the store to the app's single SQLite connection. Idempotent. */
export function initDownloadStore(database: SQLiteDatabase): void {
  db = database;
  if (changesUnsub === null) {
    changesUnsub = subscribeDownloadsChanged(() => {
      void refresh();
    });
  }
  void refresh();
}

export function getDownloadsSnapshot(): DownloadRow[] {
  return rows;
}

export function subscribeDownloads(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** Force an immediate refresh (e.g. on screen focus). */
export function refreshDownloadStore(): Promise<void> {
  return refresh();
}
