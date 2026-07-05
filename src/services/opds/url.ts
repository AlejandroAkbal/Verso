/**
 * Normalize a user-entered URL into a Calibre-Web–friendly OPDS endpoint.
 * Appends `/opds` when the host has no OPDS path segment.
 */
export function normalizeOpdsUrl(url: string): string {
  let trimmed = url.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    trimmed = `https://${trimmed}`;
  }

  const parsed = new URL(trimmed);
  const path = parsed.pathname.replace(/\/+$/, '');

  if (path === '' || path === '/') {
    parsed.pathname = '/opds';
  }

  return parsed.href.replace(/\/+$/, '');
}

/** Display name when the user does not provide one. */
export function deriveServerTitle(url: string, feedTitle?: string): string {
  const trimmedFeed = feedTitle?.trim();
  if (trimmedFeed && trimmedFeed.toLowerCase() !== 'catalog') {
    return trimmedFeed;
  }

  try {
    const host = new URL(url).hostname.replace(/^www\./, '');
    const label = host.split('.')[0];
    if (label) {
      return label.charAt(0).toUpperCase() + label.slice(1);
    }
    return host;
  } catch {
    return 'My Library';
  }
}
