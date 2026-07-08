export function resolveDownloadUrl(downloadUrl: string, serverUrl: string): string | null {
  try {
    return new URL(downloadUrl, serverUrl).toString();
  } catch {
    return null;
  }
}

export function isSameOriginUrl(candidateUrl: string, serverUrl: string): boolean {
  try {
    return new URL(candidateUrl, serverUrl).origin === new URL(serverUrl).origin;
  } catch {
    return false;
  }
}
