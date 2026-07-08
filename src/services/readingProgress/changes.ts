type ReadingProgressChangedListener = (bookId: string) => void;

const listeners = new Set<ReadingProgressChangedListener>();

export function subscribeReadingProgressChanged(
  listener: ReadingProgressChangedListener,
): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyReadingProgressChanged(bookId: string): void {
  for (const listener of listeners) {
    listener(bookId);
  }
}
