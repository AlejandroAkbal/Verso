/** Tracks in-flight downloads started from the UI so celebration survives remounts. */
const activeBookIds = new Set<string>();

export function markBookDownloadSession(bookId: string): void {
  activeBookIds.add(bookId);
}

export function isBookDownloadSessionActive(bookId: string): boolean {
  return activeBookIds.has(bookId);
}

export function clearBookDownloadSession(bookId: string): void {
  activeBookIds.delete(bookId);
}

export function clearAllDownloadSessions(): void {
  activeBookIds.clear();
}
