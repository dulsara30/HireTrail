import { describe, expect, it, vi } from 'vitest';
import { WebSearchUnavailableError } from '../../../core/ports/web-search.port';
import { TavilyWebSearch } from '../tavily.web-search';

const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

const make = (response: Response | Error) => {
  const http = vi.fn(async () => {
    if (response instanceof Error) throw response;
    return response;
  }) as unknown as typeof fetch;
  return { search: new TavilyWebSearch('tvly-test', http), http };
};

const reasonOf = async (promise: Promise<unknown>) => {
  try {
    await promise;
  } catch (err) {
    return (err as WebSearchUnavailableError).reason;
  }
  return null;
};

describe('TavilyWebSearch', () => {
  it('maps results and sends the key only in the Authorization header', async () => {
    const { search, http } = make(
      json(200, {
        results: [
          {
            url: 'https://acme.example',
            title: 'Acme',
            content: 'snippet',
            raw_content: 'full page',
          },
          { url: 'javascript:alert(1)', title: 'bad', content: 'x' },
          { title: 'no url' },
        ],
      }),
    );
    const results = await search.search('Acme company');
    expect(results).toEqual([
      { url: 'https://acme.example', title: 'Acme', snippet: 'snippet', text: 'full page' },
    ]);
    const [url, init] = (http as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('https://api.tavily.com/search');
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tvly-test');
    expect(String(init.body)).not.toContain('tvly-test');
  });

  it('reports credit limits, rate limits, bad keys and failures with the right reason', async () => {
    expect(await reasonOf(make(json(432, {})).search.search('x'))).toBe('QUOTA');
    expect(await reasonOf(make(json(433, {})).search.search('x'))).toBe('QUOTA');
    expect(await reasonOf(make(json(429, {})).search.search('x'))).toBe('RATE_LIMIT');
    expect(await reasonOf(make(json(401, {})).search.search('x'))).toBe('AUTH');
    expect(await reasonOf(make(json(500, {})).search.search('x'))).toBe('ERROR');
    expect(await reasonOf(make(new Error('network')).search.search('x'))).toBe('ERROR');
  });

  it('is not configured without a key and refuses to search', async () => {
    const search = new TavilyWebSearch(undefined);
    expect(search.isConfigured()).toBe(false);
    expect(await reasonOf(search.search('x'))).toBe('AUTH');
  });
});
