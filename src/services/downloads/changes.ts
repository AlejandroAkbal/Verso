type DownloadsChangedListener = () => void;

const listeners = new Set<DownloadsChangedListener>();

/** Subscribe to download table mutations (remove, enqueue, complete, fail). */
export function subscribeDownloadsChanged(listener: DownloadsChangedListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function notifyDownloadsChanged(): void {
  for (const listener of listeners) {
    listener();
  }
}
