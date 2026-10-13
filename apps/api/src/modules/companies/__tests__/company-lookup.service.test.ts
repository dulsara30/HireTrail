import { describe, expect, it, vi } from 'vitest';
import { AiToolUnavailableError, type AiProvider } from '../../../core/ports/ai-provider.port';
import { UpstreamError } from '../../../core/errors/domain-errors';
import { UsageAccumulator, type AiQuotaService } from '../../ai/services/ai-quota.service';
import { type AiLookupCacheRepository } from '../repositories/ai-lookup-cache.repository';
import { CompanyLookupService } from '../services/company-lookup.service';
import { type Evidence, type CompanyEvidenceService } from '../services/company-evidence.service';

const TEXT =
  'Acentura is a software company based in Colombo, Sri Lanka. We build web and mobile products for clients.';
const URL_ABOUT = 'https://acentura.example/about';

const evidenceWith = (over: Partial<Evidence>): Evidence => ({
  pages: [{ url: URL_ABOUT, title: 'Acentura', text: TEXT, via: 'search' }],
  urls: [URL_ABOUT],
  sources: [{ url: URL_ABOUT, title: 'Acentura' }],
  searchUnavailable: false,
  ...over,
});

function setup(options: { evidence: Evidence; ai?: Partial<AiProvider>; cached?: boolean }) {
  const generateJson = vi.fn();
  const ai = { generateJson, ...options.ai } as unknown as AiProvider;
  const quota = {
    track: async (_u: string, _f: unknown, work: (u: UsageAccumulator) => Promise<unknown>) => ({
      result: await work(new UsageAccumulator()),
      usageId: 'usage',
    }),
  } as unknown as AiQuotaService;
  const cache = {
    findFresh: vi.fn(async () =>
      options.cached
        ? {
            result: { found: true, profile: { name: 'Cached Co' } },
            sources: [],
          }
        : null,
    ),
    save: vi.fn(async () => undefined),
  } as unknown as AiLookupCacheRepository;
  const gather = vi.fn(async () => options.evidence);
  const evidence = { gather } as unknown as CompanyEvidenceService;
  return {
    service: new CompanyLookupService(ai, quota, cache, evidence),
    generateJson,
    gather,
    cache,
  };
}

const modelOutput = (over: Record<string, unknown> = {}) => ({
  data: {
    found: true,
    name: { value: 'Acentura', sourceUrls: [URL_ABOUT] },
    website: { value: 'https://acentura.example', sourceUrls: [URL_ABOUT] },
    country: { value: 'Sri Lanka', sourceUrls: [URL_ABOUT] },
    city: { value: 'Colombo', sourceUrls: [URL_ABOUT] },
    industry: { value: 'Banking', sourceUrls: [URL_ABOUT] },
    description: { value: 'A software company.', sourceUrls: [URL_ABOUT] },
    ...over,
  },
  groundingSources: [],
  usage: { inputTokens: 1, outputTokens: 1 },
  modelId: 'extract-model',
});

describe('CompanyLookupService', () => {
  it('builds the profile from real pages and drops values the pages do not contain', async () => {
    const { service, generateJson } = setup({ evidence: evidenceWith({}) });
    generateJson.mockResolvedValue(modelOutput());

    const result = await service.lookup('user1', { name: 'Acentura' });

    expect(result.found).toBe(true);
    expect(result.profile?.country).toBe('Sri Lanka');
    expect(result.profile?.city).toBe('Colombo');
    expect(result.profile?.website).toBe('https://acentura.example');
    // "Banking" does not appear in any page, so it must not be kept
    expect(result.profile?.industry).toBeNull();
    expect(result.sources.map((s) => s.url)).toEqual([URL_ABOUT]);
    expect(generateJson.mock.calls[0]?.[0].tools).toBeUndefined();
  });

  it('drops a value whose cited link is not one of the pages we read', async () => {
    const { service, generateJson } = setup({ evidence: evidenceWith({}) });
    generateJson.mockResolvedValue(
      modelOutput({ country: { value: 'Sri Lanka', sourceUrls: ['https://made-up.example/x'] } }),
    );
    const result = await service.lookup('user1', { name: 'Acentura' });
    expect(result.profile?.country).toBeNull();
  });

  it('reports not found when the pages never mention the returned company name', async () => {
    const { service, generateJson } = setup({ evidence: evidenceWith({}) });
    generateJson.mockResolvedValue(
      modelOutput({ name: { value: 'Totally Other Ltd', sourceUrls: [URL_ABOUT] } }),
    );
    const result = await service.lookup('user1', { name: 'Acentura' });
    expect(result.found).toBe(false);
    expect(result.profile).toBeNull();
  });

  it('serves a cached profile without searching or calling a model', async () => {
    const { service, gather, generateJson } = setup({ evidence: evidenceWith({}), cached: true });
    const result = await service.lookup('user1', { name: 'Cached Co' });
    expect(result.fromCache).toBe(true);
    expect(gather).not.toHaveBeenCalled();
    expect(generateJson).not.toHaveBeenCalled();
  });

  it('says search is unavailable when no page was found and no search could run', async () => {
    const { service, generateJson } = setup({
      evidence: evidenceWith({ pages: [], urls: [], sources: [], searchUnavailable: true }),
    });
    generateJson.mockRejectedValue(new AiToolUnavailableError());
    await expect(service.lookup('user1', { name: 'Acentura' })).rejects.toBeInstanceOf(
      UpstreamError,
    );
  });

  it('reports not found (not an error) when search ran but found nothing', async () => {
    const { service, generateJson, cache } = setup({
      evidence: evidenceWith({ pages: [], urls: [], sources: [], searchUnavailable: false }),
    });
    generateJson.mockRejectedValue(new AiToolUnavailableError());
    const result = await service.lookup('user1', { name: 'Acentura' });
    expect(result.found).toBe(false);
    expect(cache.save).toHaveBeenCalled();
  });

  it('uses Gemini Google Search when there are no pages and its quota allows it', async () => {
    const { service, generateJson } = setup({
      evidence: evidenceWith({ pages: [], urls: [], sources: [], searchUnavailable: true }),
    });
    generateJson.mockResolvedValue({
      ...modelOutput(),
      groundingSources: [{ url: URL_ABOUT, title: 'Acentura' }],
    });
    const result = await service.lookup('user1', { name: 'Acentura' });
    expect(result.found).toBe(true);
    expect(generateJson.mock.calls[0]?.[0].tools).toEqual(['google_search']);
  });

  it('fills LinkedIn, careers page and contact email from real addresses and page text', async () => {
    const text = TEXT + ' Reach us at careers@acentura.example or info@gmail.com. Founded in 2012.';
    const { service, generateJson } = setup({
      evidence: evidenceWith({
        pages: [{ url: URL_ABOUT, title: 'Acentura', text, via: 'search' }],
        urls: [
          URL_ABOUT,
          'https://www.linkedin.com/company/acentura',
          'https://acentura.example/careers',
          'https://other.example/careers',
        ],
      }),
    });
    generateJson.mockResolvedValue(
      modelOutput({
        foundedYear: { value: '2012', sourceUrls: [URL_ABOUT] },
        techStack: { values: ['React', 'Node.js'], sourceUrls: [URL_ABOUT] },
      }),
    );
    const profile = (await service.lookup('user1', { name: 'Acentura' })).profile;
    expect(profile?.linkedinUrl).toBe('https://www.linkedin.com/company/acentura');
    expect(profile?.careersUrl).toBe('https://acentura.example/careers');
    expect(profile?.contactEmail).toBe('careers@acentura.example');
    expect(profile?.foundedYear).toBe('2012');
  });

  it('keeps only tech names, years and cities that the pages support', async () => {
    const text =
      TEXT + ' Our stack is React and Node.js. Offices: Level 3, Onyx Tower, Colombo 03.';
    const { service, generateJson } = setup({
      evidence: evidenceWith({
        pages: [{ url: URL_ABOUT, title: 'Acentura', text, via: 'search' }],
      }),
    });
    generateJson.mockResolvedValue(
      modelOutput({
        city: { value: 'Level 3, Onyx Tower, Colombo 03', sourceUrls: [URL_ABOUT] },
        foundedYear: { value: '1999', sourceUrls: [URL_ABOUT] },
        techStack: { values: ['React', 'Node.js', 'Cobol'], sourceUrls: [URL_ABOUT] },
      }),
    );
    const profile = (await service.lookup('user1', { name: 'Acentura' })).profile;
    // an address is not a city, 1999 is not in the text, Cobol is not in the text
    expect(profile?.city).toBeNull();
    expect(profile?.foundedYear).toBeNull();
    expect(profile?.techStack).toEqual(['React', 'Node.js']);
  });

  it('does not use an email from another domain or a LinkedIn page of another company', async () => {
    const text = TEXT + ' Contact someone@gmail.com for help.';
    const { service, generateJson } = setup({
      evidence: evidenceWith({
        pages: [{ url: URL_ABOUT, title: 'Acentura', text, via: 'search' }],
        urls: [URL_ABOUT, 'https://www.linkedin.com/company/totally-different-co'],
      }),
    });
    generateJson.mockResolvedValue(modelOutput());
    const profile = (await service.lookup('user1', { name: 'Acentura' })).profile;
    expect(profile?.contactEmail).toBeNull();
    expect(profile?.linkedinUrl).toBeNull();
  });
});
