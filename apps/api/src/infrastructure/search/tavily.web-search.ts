import {
  WebSearchUnavailableError,
  type WebSearchProvider,
  type WebSearchResult,
} from '../../core/ports/web-search.port';

const ENDPOINT = 'https://api.tavily.com/search';
const MAX_TEXT = 6000;

interface TavilyResponse {
  results?: Array<{
    url?: unknown;
    title?: unknown;
    content?: unknown;
    raw_content?: unknown;
  }>;
}

/** Tavily web search (free plan: about 1,000 credits a month). A basic search costs 1 credit. */
export class TavilyWebSearch implements WebSearchProvider {
  public readonly id = 'tavily';

  constructor(
    private readonly apiKey: string | undefined,
    private readonly http: typeof fetch = fetch,
    private readonly timeoutMs = 15000,
  ) {}

  public isConfigured(): boolean {
    return Boolean(this.apiKey);
  }

  public async search(
    query: string,
    options: { maxResults?: number } = {},
  ): Promise<WebSearchResult[]> {
    if (!this.apiKey) throw new WebSearchUnavailableError('AUTH', 'Tavily API key is not set');

    let res: Response;
    try {
      res = await this.http(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: 'basic',
          max_results: options.maxResults ?? 5,
          include_raw_content: 'text',
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      });
    } catch {
      throw new WebSearchUnavailableError('ERROR', 'The search request failed or timed out');
    }

    if (res.status === 429) throw new WebSearchUnavailableError('RATE_LIMIT', 'Search rate limit');
    // 432 and 433: the key or plan credit limit is used up
    if (res.status === 432 || res.status === 433) {
      throw new WebSearchUnavailableError('QUOTA', 'Search credits are used up');
    }
    if (res.status === 401 || res.status === 403) {
      throw new WebSearchUnavailableError('AUTH', 'Search API key was rejected');
    }
    if (!res.ok) throw new WebSearchUnavailableError('ERROR', `Search failed (${res.status})`);

    let body: TavilyResponse;
    try {
      body = (await res.json()) as TavilyResponse;
    } catch {
      throw new WebSearchUnavailableError('ERROR', 'Search returned an unreadable response');
    }

    const out: WebSearchResult[] = [];
    for (const r of body.results ?? []) {
      if (typeof r.url !== 'string' || !/^https?:\/\//i.test(r.url)) continue;
      out.push({
        url: r.url,
        title: typeof r.title === 'string' ? r.title : '',
        snippet: typeof r.content === 'string' ? r.content : '',
        text: typeof r.raw_content === 'string' ? r.raw_content.slice(0, MAX_TEXT) : null,
      });
    }
    return out;
  }
}
