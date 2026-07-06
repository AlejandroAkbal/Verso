export type SummarySegment =
  | { type: 'text'; value: string }
  | { type: 'link'; label: string; href: string };

const LINK_REGEX = /<a\b[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
const TAG_REGEX = /<[^>]+>/g;

function decodeBasicEntities(value: string): string {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');
}

function stripTags(value: string): string {
  return decodeBasicEntities(value.replace(TAG_REGEX, ' ').replace(/\s+/g, ' ').trim());
}

export function parseOpdsSummary(summary: string): SummarySegment[] {
  const trimmed = summary.trim();
  if (!trimmed) {
    return [];
  }

  if (!/<a\b/i.test(trimmed)) {
    return [{ type: 'text', value: stripTags(trimmed) }];
  }

  const segments: SummarySegment[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  LINK_REGEX.lastIndex = 0;
  while ((match = LINK_REGEX.exec(trimmed)) !== null) {
    const [fullMatch, href, innerHtml] = match;
    const before = trimmed.slice(lastIndex, match.index);
    const beforeText = stripTags(before);
    if (beforeText) {
      segments.push({ type: 'text', value: beforeText });
    }

    const label = stripTags(innerHtml);
    if (href && label) {
      segments.push({ type: 'link', label, href });
    }

    lastIndex = match.index + fullMatch.length;
  }

  const tail = stripTags(trimmed.slice(lastIndex));
  if (tail) {
    segments.push({ type: 'text', value: tail });
  }

  if (segments.length === 0) {
    return [{ type: 'text', value: stripTags(trimmed) }];
  }

  return segments;
}

export function summaryPlainText(summary: string): string {
  return parseOpdsSummary(summary)
    .map((segment) => (segment.type === 'text' ? segment.value : segment.label))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
