import { JSDOM, VirtualConsole } from 'jsdom';
import { Readability } from '@mozilla/readability';

export interface ExtractedContent {
  title: string;
  text: string;
}

export function normalizeWhitespace(input: string): string {
  return input
    .replace(/\r/g, '')
    .replace(/[ \t\f\v]+/g, ' ')
    .replace(/ ?\n ?/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export class ContentExtractor {
  public static fromHtml(html: string, url: string): ExtractedContent {
    // Scripts are never executed (default jsdom behaviour) and console noise is silenced.
    const dom = new JSDOM(html, { url, virtualConsole: new VirtualConsole() });
    const doc = dom.window.document;
    const article = new Readability(doc.cloneNode(true) as Document).parse();
    const text = article?.textContent ?? doc.body?.textContent ?? '';
    return { title: article?.title ?? doc.title ?? '', text: normalizeWhitespace(text) };
  }

  public static fromPlain(text: string): ExtractedContent {
    return { title: '', text: normalizeWhitespace(text) };
  }

  /** Strips tags from user-pasted text that may contain HTML. */
  public static stripHtml(input: string): string {
    if (!/<[a-z!/][^>]*>/i.test(input)) return normalizeWhitespace(input);
    const dom = new JSDOM(`<body>${input}</body>`, { virtualConsole: new VirtualConsole() });
    return normalizeWhitespace(dom.window.document.body.textContent ?? '');
  }
}
