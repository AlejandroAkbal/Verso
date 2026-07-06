export type ToastVariant = 'error' | 'success' | 'info';

type ToastHandler = (message: string, variant: ToastVariant) => void;

let handler: ToastHandler | undefined;

let lastSyncErrorMessage = '';
let lastSyncErrorAt = 0;

export function registerToastHandler(next: ToastHandler | undefined): void {
  handler = next;
}

export function showToast(message: string, variant: ToastVariant = 'info'): void {
  handler?.(message, variant);
}

/** Throttled error toast for background sync failures. */
export function showSyncErrorToast(message: string): void {
  const now = Date.now();
  if (message === lastSyncErrorMessage && now - lastSyncErrorAt < 8000) {
    return;
  }
  lastSyncErrorMessage = message;
  lastSyncErrorAt = now;
  showToast(message, 'error');
}
