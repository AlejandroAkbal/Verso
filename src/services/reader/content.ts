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

function parseOpfAttributes(tag: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const match of tag.matchAll(/([\w:-]+)="([^"]*)"/g)) {
    attrs[match[1]] = match[2];
  }
  return attrs;
}

function parseOpfManifest(opfXml: string, opfDir: string): Map<string, string> {
  const manifest = new Map<string, string>();
  for (const match of opfXml.matchAll(/<item\b[^>]*\/?>/gi)) {
    const attrs = parseOpfAttributes(match[0]);
    const id = attrs.id;
    const href = attrs.href;
    if (id && href) {
      manifest.set(id, opfDir + href);
    }
  }
  return manifest;
}

function parseOpfSpine(opfXml: string): string[] {
  const idrefs: string[] = [];
  for (const match of opfXml.matchAll(/<itemref\b[^>]*\/?>/gi)) {
    const idref = parseOpfAttributes(match[0]).idref;
    if (idref) {
      idrefs.push(idref);
    }
  }
  return idrefs;
}

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

  const manifest = parseOpfManifest(opfXml, opfDir);
  const spineIdrefs = parseOpfSpine(opfXml);
  const chapters: ReaderChapter[] = [];

  for (const [index, idref] of spineIdrefs.entries()) {
    const href = manifest.get(idref);
    if (!href) continue;

    const html = await zip.file(href)?.async('string');
    if (!html) continue;

    chapters.push({
      id: idref,
      title: `Chapter ${index + 1}`,
      html,
    });
  }

  const plainText = chapters.map((c) => stripHtml(c.html)).join('\n\n');

  if (chapters.length === 0) {
    throw new Error('Invalid EPUB: no readable chapters in spine');
  }
  if (!plainText.trim()) {
    throw new Error('Invalid EPUB: no text content');
  }

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
