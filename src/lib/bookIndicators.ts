import type { BookRow, ReadingProgressRow } from '@/db/schema';

/** Books first seen in the catalog within this window show a "New" badge. */
const NEW_BOOK_MS = 14 * 24 * 60 * 60 * 1000;

export function isNewBook(
  book: BookRow,
  options: {
    isDownloaded: boolean;
    readingProgress?: ReadingProgressRow | null;
  },
): boolean {
  if (options.isDownloaded) return false;
  if (options.readingProgress && options.readingProgress.position > 0) return false;
  // cached_at doubles as first_seen_at; 0 means pre-migration / already in library.
  if (book.cached_at <= 0) return false;

  const age = Date.now() - book.cached_at;
  return age >= 0 && age < NEW_BOOK_MS;
}
