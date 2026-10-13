import {
  AiFeature,
  type CompanyLookupDto,
  type CompanyLookupRequestInput,
} from '@hiretrail/shared';
import {
  AiToolUnavailableError,
  type AiProvider,
  type GroundingSource,
} from '../../../core/ports/ai-provider.port';
import { UpstreamError } from '../../../core/errors/domain-errors';
import {
  LOOKUP_EVIDENCE_SYSTEM_PROMPT,
  LOOKUP_STRUCTURE_SCHEMA,
  LOOKUP_SYSTEM_PROMPT,
  type LookupAiOutput,
  type SourcedList,
  type SourcedValue,
} from '../../../infrastructure/ai/gemini/prompts/lookup.prompt';
import { type AiQuotaService } from '../../ai/services/ai-quota.service';
import { CompanyRepository } from '../repositories/company.repository';
import { type AiLookupCacheRepository } from '../repositories/ai-lookup-cache.repository';
import { matchesGroundingSource } from './company-domain';
import { type CompanyEvidenceService } from './company-evidence.service';
import {
  extractContactEmail,
  findCareersUrl,
  findLinkedinCompanyUrl,
  isPlausibleYear,
  looksLikeCityName,
  mentionsCompany,
  valueBackedByPages,
  type EvidencePage,
} from './company-evidence';

type Profile = NonNullable<CompanyLookupDto['profile']>;

export class CompanyLookupService {
  constructor(
    private readonly ai: AiProvider,
    private readonly quota: AiQuotaService,
    private readonly cache: AiLookupCacheRepository,
    private readonly evidence: CompanyEvidenceService,
  ) {}

  public async lookup(userId: string, input: CompanyLookupRequestInput): Promise<CompanyLookupDto> {
    const normalizedName = CompanyRepository.normalizeName(input.name);

    // Hinted requests never read or write the shared cache.
    if (!input.hint) {
      const cached = await this.cache.findFresh(normalizedName);
      if (cached) {
        const stored = cached.result as unknown as Pick<CompanyLookupDto, 'found' | 'profile'>;
        return {
          isAiResult: true,
          found: stored.found,
          profile: stored.profile,
          sources: cached.sources,
          fromCache: true,
        };
      }
    }

    const { result } = await this.quota.track(userId, AiFeature.COMPANY_LOOKUP, async (usage) => {
      // 1. Real pages from web search (or the company's own website), read by the extract model
      const found = await this.evidence.gather(input.name, { hint: input.hint });
      if (found.pages.length > 0) {
        const res = await this.ai.generateJson<LookupAiOutput>({
          model: 'extract',
          system: LOOKUP_EVIDENCE_SYSTEM_PROMPT,
          content: JSON.stringify({
            name: input.name,
            hint: input.hint ?? null,
            pages: found.pages.map((p) => ({ url: p.url, title: p.title, text: p.text })),
          }),
          jsonSchema: LOOKUP_STRUCTURE_SCHEMA,
          timeoutMs: 30_000,
        });
        usage.add(res.modelId, res.usage);
        return {
          output: res.data,
          sources: found.sources,
          pages: found.pages,
          urls: found.urls,
          model: res.modelId,
        };
      }

      // 2. Google Search through Gemini, when its quota allows it
      try {
        const res = await this.ai.generateJson<LookupAiOutput>({
          model: 'grounded',
          system: LOOKUP_SYSTEM_PROMPT,
          content: JSON.stringify({ name: input.name, hint: input.hint ?? null }),
          jsonSchema: LOOKUP_STRUCTURE_SCHEMA,
          tools: ['google_search'],
          timeoutMs: 50_000,
        });
        usage.add(res.modelId, res.usage);
        return {
          output: res.data,
          sources: res.groundingSources,
          pages: [] as EvidencePage[],
          urls: [] as string[],
          model: res.modelId,
        };
      } catch (err) {
        if (!(err instanceof AiToolUnavailableError)) throw err;
        // Search could not run at all: say so. Search ran but found nothing: the company was not found.
        if (found.searchUnavailable) {
          throw new UpstreamError(
            'Company search is unavailable right now. Add the company manually.',
          );
        }
        return {
          output: { found: false } as LookupAiOutput,
          sources: [] as GroundingSource[],
          pages: [] as EvidencePage[],
          urls: [] as string[],
          model: 'none',
        };
      }
    });

    const dto = this.toDto(result.output, result.sources, result.pages, result.urls);
    if (!input.hint) {
      await this.cache.save({
        normalizedName,
        result: { found: dto.found, profile: dto.profile },
        sources: dto.sources,
        model: result.model,
      });
    }
    return dto;
  }

  /**
   * Every value must cite a source. When we read the pages ourselves, the page must also contain
   * the value, so a model cannot slip in a made-up fact with a real-looking link.
   */
  private toDto(
    output: LookupAiOutput,
    sources: GroundingSource[],
    pages: EvidencePage[],
    urls: string[] = [],
  ): CompanyLookupDto {
    const checked = pages.length > 0;
    const take = (
      field: SourcedValue | null | undefined,
      kind: 'url' | 'text' | 'free' = 'text',
    ): string | null => {
      if (!field?.value?.trim()) return null;
      const urls = (field.sourceUrls ?? []).filter((u) => matchesGroundingSource(u, sources));
      if (urls.length === 0) return null;
      if (checked && kind !== 'free' && !valueBackedByPages(field.value, urls, pages, kind)) {
        return null;
      }
      return field.value.trim();
    };

    const takeList = (field: SourcedList | null | undefined): string[] => {
      if (!field?.values?.length) return [];
      const cited = (field.sourceUrls ?? []).filter((u) => matchesGroundingSource(u, sources));
      if (cited.length === 0) return [];
      const kept = field.values
        .map((v) => v.trim())
        .filter((v) => v.length > 0 && v.length <= 40)
        .filter((v) => !checked || valueBackedByPages(v, cited, pages));
      return Array.from(new Set(kept)).slice(0, 12);
    };

    const name = take(output.name, 'free');
    const nameConfirmed =
      !checked ||
      (name !== null && pages.some((p) => mentionsCompany(`${p.title} ${p.text}`, name)));
    if (!output.found || !name || !nameConfirmed) {
      return { isAiResult: true, found: false, fromCache: false, profile: null, sources: [] };
    }

    const website = take(output.website, 'url');
    const city = take(output.city);
    const country = take(output.country);
    const year = take(output.foundedYear);

    // Found by code from real addresses and page text, so they cannot be made up
    const linkedinUrl = checked ? findLinkedinCompanyUrl(urls, name) : null;
    const careersUrl =
      take(output.careersUrl, 'url') ?? (checked ? findCareersUrl(urls, website) : null);
    const email = checked ? extractContactEmail(pages, website) : null;

    const profile: Profile = {
      name,
      website,
      careersUrl,
      country: country && country.length <= 60 ? country : null,
      city: city && looksLikeCityName(city) ? city : null,
      industry: take(output.industry),
      size: take(output.size),
      description: take(output.description, 'free')?.slice(0, 300) ?? null,
      linkedinUrl,
      contactEmail: email?.email ?? null,
      foundedYear: year && isPlausibleYear(year) ? year : null,
      techStack: takeList(output.techStack),
    };
    const used = new Set(
      [
        output.name,
        output.website,
        output.careersUrl,
        output.country,
        output.city,
        output.industry,
        output.size,
        output.description,
        output.foundedYear,
        output.techStack,
      ]
        .flatMap((f) => f?.sourceUrls ?? [])
        .filter((u) => matchesGroundingSource(u, sources)),
    );
    for (const extra of [linkedinUrl, careersUrl, email?.url]) {
      if (extra) used.add(extra);
    }
    return {
      isAiResult: true,
      found: true,
      fromCache: false,
      profile,
      sources: [...used].map((url) => ({ url })),
    };
  }
}
