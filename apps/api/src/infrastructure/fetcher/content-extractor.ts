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

type DomLibs = {
  JSDOM: typeof import('jsdom').JSDOM;
  VirtualConsole: typeof import('jsdom').VirtualConsole;
  Readability: typeof import('@mozilla/readability').Readability;
};

let domLibs: Promise<DomLibs> | null = null;

/**
 * jsdom is heavy and pulls in packages that some serverless runtimes cannot load, so it is loaded
 * only when a page actually has to be parsed. The API starts and serves everything else without it.
 */
function loadDom(): Promise<DomLibs> {
  domLibs ??= Promise.all([import('jsdom'), import('@mozilla/readability')]).then(
    ([jsdom, readability]) => ({
      JSDOM: jsdom.JSDOM,
      VirtualConsole: jsdom.VirtualConsole,
      Readability: readability.Readability,
    }),
  );
  return domLibs;
}

export class ContentExtractor {
  public static async fromHtml(html: string, url: string): Promise<ExtractedContent> {
    const { JSDOM, VirtualConsole, Readability } = await loadDom();
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
  public static async stripHtml(input: string): Promise<string> {
    if (!/<[a-z!/][^>]*>/i.test(input)) return normalizeWhitespace(input);
    const { JSDOM, VirtualConsole } = await loadDom();
    const dom = new JSDOM(`<body>${input}</body>`, { virtualConsole: new VirtualConsole() });
    return normalizeWhitespace(dom.window.document.body.textContent ?? '');
  }
}
