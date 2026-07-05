import { File } from 'expo-file-system';
import JSZip from 'jszip';

export type ReaderChapter = {
  id: string;
  title: string;
  html: string;
};

export type ReaderContent = {
  title: string;
  chapters: ReaderChapter[];
  plainText: string;
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

async function loadEpubContent(localUri: string): Promise<ReaderContent> {
  const file = new File(localUri);
  const buffer = await file.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  const zip = await JSZip.loadAsync(bytes);
  const containerXml = await zip.file('META-INF/container.xml')?.async('string');
  if (!containerXml) {
    throw new Error('Invalid EPUB: missing container.xml');
  }

  const rootfileMatch = containerXml.match(/full-path="([^"]+)"/);
  if (!rootfileMatch) {
    throw new Error('Invalid EPUB: missing rootfile');
  }

  const opfPath = rootfileMatch[1];
  const opfDir = opfPath.includes('/')
    ? opfPath.slice(0, opfPath.lastIndexOf('/') + 1)
    : '';

  const opfXml = await zip.file(opfPath)?.async('string');
  if (!opfXml) {
    throw new Error('Invalid EPUB: missing OPF');
  }

  const titleMatch = opfXml.match(/<dc:title[^>]*>([\s\S]*?)<\/dc:title>/i);
  const title = titleMatch ? stripHtml(titleMatch[1]) : 'Untitled';

  const manifestItems = [...opfXml.matchAll(/<item[^>]+id="([^"]+)"[^>]+href="([^"]+)"[^>]*\/?>/gi)];
  const manifest = new Map<string, string>();
  for (const match of manifestItems) {
    manifest.set(match[1], opfDir + match[2]);
  }

  const spineItems = [...opfXml.matchAll(/<itemref[^>]+idref="([^"]+)"[^>]*\/?>/gi)];
  const chapters: ReaderChapter[] = [];

  for (const [index, match] of spineItems.entries()) {
    const href = manifest.get(match[1]);
    if (!href) continue;

    const html = await zip.file(href)?.async('string');
    if (!html) continue;

    chapters.push({
      id: match[1],
      title: `Chapter ${index + 1}`,
      html,
    });
  }

  const plainText = chapters.map((c) => stripHtml(c.html)).join('\n\n');

  return { title, chapters, plainText };
}

async function loadTextContent(localUri: string): Promise<ReaderContent> {
  const file = new File(localUri);
  const plainText = await file.text();
  return {
    title: 'Document',
    chapters: [{ id: 'text', title: 'Content', html: plainText }],
    plainText,
  };
}

export async function loadBookContent(
  localUri: string,
  mime: string,
): Promise<ReaderContent> {
  const lower = localUri.toLowerCase();
  if (mime.includes('epub') || lower.endsWith('.epub')) {
    return loadEpubContent(localUri);
  }
  return loadTextContent(localUri);
}

export function paginateText(
  text: string,
  charsPerPage: number,
): string[] {
  if (!text) return [''];
  const pages: string[] = [];
  const paragraphs = text.split(/\n\n+/);
  let current = '';

  for (const paragraph of paragraphs) {
    const candidate = current ? `${current}\n\n${paragraph}` : paragraph;
    if (candidate.length <= charsPerPage) {
      current = candidate;
    } else if (!current) {
      let remaining = paragraph;
      while (remaining.length > charsPerPage) {
        pages.push(remaining.slice(0, charsPerPage));
        remaining = remaining.slice(charsPerPage);
      }
      current = remaining;
    } else {
      pages.push(current);
      current = paragraph;
    }
  }

  if (current) {
    pages.push(current);
  }

  return pages.length > 0 ? pages : [''];
}

export function charsPerPageForFontSize(fontSize: number): number {
  const baseChars = 1800;
  const ratio = 18 / fontSize;
  return Math.round(baseChars * ratio);
}
