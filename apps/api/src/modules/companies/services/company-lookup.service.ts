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
  LOOKUP_STRUCTURE_SCHEMA,
  LOOKUP_SYSTEM_PROMPT,
  type LookupAiOutput,
  type SourcedValue,
} from '../../../infrastructure/ai/gemini/prompts/lookup.prompt';
import { type AiQuotaService } from '../../ai/services/ai-quota.service';
import { CompanyRepository } from '../repositories/company.repository';
import { type AiLookupCacheRepository } from '../repositories/ai-lookup-cache.repository';
import { matchesGroundingSource } from './company-verification.service';

type Profile = NonNullable<CompanyLookupDto['profile']>;

export class CompanyLookupService {
  constructor(
    private readonly ai: AiProvider,
    private readonly quota: AiQuotaService,
    private readonly cache: AiLookupCacheRepository,
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
      try {
        const res = await this.ai.generateJson<LookupAiOutput>({
          model: 'grounded',
          system: LOOKUP_SYSTEM_PROMPT,
          content: JSON.stringify({ name: input.name, hint: input.hint ?? null }),
          jsonSchema: LOOKUP_STRUCTURE_SCHEMA,
          tools: ['google_search'],
          timeoutMs: 60_000,
        });
        usage.add(res.modelId, res.usage);
        return { output: res.data, sources: res.groundingSources, model: res.modelId };
      } catch (err) {
        if (err instanceof AiToolUnavailableError) {
          throw new UpstreamError(
            'Company search is unavailable right now. Add the company manually.',
          );
        }
        throw err;
      }
    });

    const dto = this.toDto(result.output, result.sources);
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

  /** Every value must have a grounding source; otherwise it is left empty. */
  private toDto(output: LookupAiOutput, sources: GroundingSource[]): CompanyLookupDto {
    const take = (field: SourcedValue | null | undefined): string | null => {
      if (!field?.value?.trim()) return null;
      const ok = (field.sourceUrls ?? []).some((u) => matchesGroundingSource(u, sources));
      return ok ? field.value.trim() : null;
    };

    const name = take(output.name);
    if (!output.found || !name) {
      return { isAiResult: true, found: false, fromCache: false, profile: null, sources: [] };
    }

    const profile: Profile = {
      name,
      website: take(output.website),
      careersUrl: take(output.careersUrl),
      country: take(output.country),
      city: take(output.city),
      industry: take(output.industry),
      size: take(output.size),
      description: take(output.description)?.slice(0, 300) ?? null,
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
      ]
        .flatMap((f) => f?.sourceUrls ?? [])
        .filter((u) => matchesGroundingSource(u, sources)),
    );
    return {
      isAiResult: true,
      found: true,
      fromCache: false,
      profile,
      sources: [...used].map((url) => ({ url })),
    };
  }
}
