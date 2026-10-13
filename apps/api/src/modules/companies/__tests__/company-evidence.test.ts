import { describe, expect, it, vi } from 'vitest';
import { type ProviderHealth } from '../../../core/ports/provider-health.port';
import { type WebPageFetcher } from '../../../core/ports/web-page-fetcher.port';
import {
  WebSearchUnavailableError,
  type WebSearchProvider,
  type WebSearchResult,
} from '../../../core/ports/web-search.port';
import { type ExternalUsageRepository } from '../../ai/repositories/external-usage.repository';
import {
  candidateDomains,
  coreName,
  extractContactEmail,
  findCareersUrl,
  findLinkedinCompanyUrl,
  isPlausibleYear,
  looksLikeCityName,
  mentionsCompany,
  valueBackedByPages,
  type EvidencePage,
} from '../services/company-evidence';
import { CompanyEvidenceService } from '../services/company-evidence.service';

const LONG =
  'Acentura is a software company based in Colombo, Sri Lanka. We build web and mobile products for clients worldwide.';

const page = (url: string, text: string): EvidencePage => ({
  url,
  title: 'Acentura',
  text,
  via: 'search',
});

describe('evidence helpers', () => {
  it('drops legal words from the company name', () => {
    expect(coreName('Acentura Pvt Ltd.')).toBe('acentura');
    expect(coreName('Sysco LABS Inc')).toBe('sysco labs');
  });

  it('checks that a text really mentions the company', () => {
    expect(mentionsCompany('Welcome to Sysco-Labs, we build software', 'Sysco LABS')).toBe(true);
    expect(mentionsCompany('A page about something else', 'Acentura Inc')).toBe(false);
    expect(mentionsCompany('anything', 'Co')).toBe(false);
  });

  it('builds website guesses from the name, or uses a domain in the hint on its own', () => {
    expect(candidateDomains('Acentura Inc')).toEqual([
      'https://acentura.com',
      'https://acentura.lk',
      'https://acentura.io',
      'https://acentura.co',
      'https://acentura.net',
      'https://acentura.org',
    ]);
    expect(candidateDomains('Acentura', 'see https://www.acentura.example.lk/about')).toEqual([
      'https://www.acentura.example.lk',
    ]);
    expect(candidateDomains('Ab')).toEqual([]);
  });

  it('accepts a value only when a cited page contains it', () => {
    const pages = [page('https://acentura.example/about', LONG)];
    const cited = ['https://acentura.example/about'];
    expect(valueBackedByPages('Sri Lanka', cited, pages)).toBe(true);
    expect(valueBackedByPages('Germany', cited, pages)).toBe(false);
    expect(valueBackedByPages('Sri Lanka', ['https://other.example/x'], pages)).toBe(false);
  });

  it('accepts a website value that matches the cited page domain', () => {
    const pages = [page('https://www.acentura.example/about', LONG)];
    expect(
      valueBackedByPages(
        'https://acentura.example',
        ['https://www.acentura.example/about'],
        pages,
        'url',
      ),
    ).toBe(true);
    expect(
      valueBackedByPages(
        'https://fake.example',
        ['https://www.acentura.example/about'],
        pages,
        'url',
      ),
    ).toBe(false);
  });
});

describe('deterministic extractors', () => {
  it('finds the LinkedIn company page only when it matches the company', () => {
    expect(
      findLinkedinCompanyUrl(['https://lk.linkedin.com/company/Acentura/about'], 'Acentura Inc'),
    ).toBe('https://www.linkedin.com/company/acentura');
    expect(
      findLinkedinCompanyUrl(['https://www.linkedin.com/company/other-co'], 'Acentura'),
    ).toBeNull();
    expect(findLinkedinCompanyUrl(['https://www.linkedin.com/in/someone'], 'Acentura')).toBeNull();
    expect(
      findLinkedinCompanyUrl(['https://evil.example/company/acentura'], 'Acentura'),
    ).toBeNull();
  });

  it('finds a careers page only on the company domain', () => {
    const urls = ['https://other.example/careers', 'https://www.acentura.com/careers/open-roles'];
    expect(findCareersUrl(urls, 'https://acentura.com')).toBe(
      'https://www.acentura.com/careers/open-roles',
    );
    expect(findCareersUrl(urls, null)).toBeNull();
    expect(findCareersUrl(['https://acentura.com/about'], 'https://acentura.com')).toBeNull();
  });

  it('prefers a role mailbox and ignores other domains, images and no-reply addresses', () => {
    const pages = [
      page(
        'https://acentura.com/contact',
        'Write to sales.team@acentura.com or hr@acentura.com, not x@gmail.com or noreply@acentura.com',
      ),
    ];
    expect(extractContactEmail(pages, 'https://acentura.com')).toEqual({
      email: 'hr@acentura.com',
      url: 'https://acentura.com/contact',
    });
    expect(
      extractContactEmail([page('https://acentura.com', 'only me@gmail.com')], null),
    ).toBeNull();
    expect(extractContactEmail([page('https://acentura.com', 'logo@2x.png')], null)).toBeNull();
  });

  it('validates founding years and city names', () => {
    expect(isPlausibleYear('2012', new Date('2026-01-01'))).toBe(true);
    expect(isPlausibleYear('2099', new Date('2026-01-01'))).toBe(false);
    expect(isPlausibleYear('twenty', new Date('2026-01-01'))).toBe(false);
    expect(looksLikeCityName('Colombo')).toBe(true);
    expect(looksLikeCityName('Level 3, Onyx Tower, Colombo 03')).toBe(false);
    expect(looksLikeCityName('')).toBe(false);
  });
});

function setup(options: {
  configured?: boolean;
  results?: WebSearchResult[];
  searchError?: Error;
  budgetAllows?: boolean;
  open?: boolean;
  websiteGuess?: boolean;
  fetchByUrl?: Record<string, { title: string; textContent: string }>;
}) {
  const search: WebSearchProvider = {
    id: 'tavily',
    isConfigured: () => options.configured ?? true,
    search: vi.fn(async () => {
      if (options.searchError) throw options.searchError;
      return options.results ?? [];
    }),
  };
  const fetcher: WebPageFetcher = {
    fetch: vi.fn(async (url: string) => {
      const hit = options.fetchByUrl?.[url];
      if (!hit) throw new Error('unreachable');
      return { title: hit.title, textContent: hit.textContent, finalUrl: url };
    }),
  };
  const health: ProviderHealth = {
    isOpen: vi.fn(async () => options.open ?? false),
    trip: vi.fn(async () => undefined),
    snapshot: vi.fn(async () => []),
  };
  const usage = {
    reserve: vi.fn(async () => options.budgetAllows ?? true),
  } as unknown as ExternalUsageRepository;
  const service = new CompanyEvidenceService(search, fetcher, health, usage, {
    monthlyBudget: 900,
    websiteGuess: options.websiteGuess ?? true,
  });
  return { service, search, fetcher, health, usage };
}

const result = (url: string, text: string, title = 'Acentura'): WebSearchResult => ({
  url,
  title,
  snippet: '',
  text,
});

describe('CompanyEvidenceService', () => {
  it('returns pages from web search that mention the company', async () => {
    const { service } = setup({
      results: [
        result('https://acentura.example/about', LONG),
        result(
          'https://unrelated.example',
          'A long page about gardening and tools for the home. '.repeat(3),
          'Garden Tools',
        ),
      ],
    });
    const evidence = await service.gather('Acentura Inc');
    expect(evidence.pages.map((p) => p.url)).toEqual(['https://acentura.example/about']);
    expect(evidence.sources[0]?.url).toBe('https://acentura.example/about');
    expect(evidence.searchUnavailable).toBe(false);
  });

  it('skips search when it is cooling down, and tries the company website instead', async () => {
    const { service, search, fetcher } = setup({
      open: true,
      fetchByUrl: { 'https://acentura.com': { title: 'Acentura', textContent: LONG } },
    });
    const evidence = await service.gather('Acentura Inc');
    expect(search.search).not.toHaveBeenCalled();
    expect(fetcher.fetch).toHaveBeenCalled();
    expect(evidence.pages[0]?.via).toBe('website');
    expect(evidence.searchUnavailable).toBe(true);
  });

  it('also reads the contact and careers pages of the company website', async () => {
    const { service } = setup({
      configured: false,
      fetchByUrl: {
        'https://acentura.com': { title: 'Acentura', textContent: LONG },
        'https://acentura.com/contact': {
          title: 'Contact Acentura',
          textContent:
            'Contact Acentura: write to hr@acentura.com or call our office in Colombo, Sri Lanka.',
        },
        'https://acentura.com/careers': {
          title: 'Careers at Acentura',
          textContent:
            'Join Acentura. We are hiring software engineers across web and mobile teams today.',
        },
      },
    });
    const evidence = await service.gather('Acentura');
    const urls = evidence.pages.map((p) => p.url);
    expect(urls).toContain('https://acentura.com/contact');
    expect(urls).toContain('https://acentura.com/careers');
    expect(evidence.urls).toContain('https://acentura.com/careers');
  });

  it('falls back to the website when the monthly budget is used up', async () => {
    const { service, search } = setup({
      budgetAllows: false,
      fetchByUrl: { 'https://acentura.com': { title: 'Acentura', textContent: LONG } },
    });
    const evidence = await service.gather('Acentura');
    expect(search.search).not.toHaveBeenCalled();
    expect(evidence.pages).toHaveLength(1);
    expect(evidence.searchUnavailable).toBe(true);
  });

  it('puts search on a long cooldown when credits run out, and a short one for a rate limit', async () => {
    const quota = setup({ searchError: new WebSearchUnavailableError('QUOTA') });
    await quota.service.gather('Acentura', {});
    expect(quota.health.trip).toHaveBeenCalledWith(
      'search:tavily',
      expect.any(Number),
      'search quota',
    );
    const longMs = (quota.health.trip as ReturnType<typeof vi.fn>).mock.calls[0]?.[1] as number;
    expect(longMs).toBeGreaterThan(60 * 60 * 1000);

    const rate = setup({ searchError: new WebSearchUnavailableError('RATE_LIMIT') });
    await rate.service.gather('Acentura', {});
    expect((rate.health.trip as ReturnType<typeof vi.fn>).mock.calls[0]?.[1]).toBe(60_000);
  });

  it('ignores a website that does not mention the company', async () => {
    const { service } = setup({
      configured: false,
      fetchByUrl: {
        'https://acentura.com': {
          title: 'Domain for sale',
          textContent:
            'This domain may be for sale. Contact the owner for pricing and details today.',
        },
      },
    });
    const evidence = await service.gather('Acentura');
    expect(evidence.pages).toEqual([]);
  });

  it('does not touch the website when the guess is turned off', async () => {
    const { service, fetcher } = setup({ configured: false, websiteGuess: false });
    const evidence = await service.gather('Acentura');
    expect(fetcher.fetch).not.toHaveBeenCalled();
    expect(evidence.pages).toEqual([]);
  });

  it('shares one search between simultaneous requests for the same company', async () => {
    const { service, search } = setup({
      results: [result('https://acentura.example/about', LONG)],
    });
    await Promise.all([service.gather('Acentura'), service.gather('Acentura')]);
    expect(search.search).toHaveBeenCalledTimes(1);
  });
});
