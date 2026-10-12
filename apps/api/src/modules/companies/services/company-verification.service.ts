import { Types } from 'mongoose';
import {
  AiFeature,
  VERIFIABLE_FIELDS,
  VERIFICATION_FRESH_DAYS,
  VERIFICATION_RECHECK_HOURS,
  type CompanyDto,
  type CompanyVerificationDto,
  type VerifiableField,
  type VerificationFieldResultDto,
} from '@hiretrail/shared';
import {
  AiToolUnavailableError,
  type AiProvider,
  type GroundingSource,
} from '../../../core/ports/ai-provider.port';
import { type WebPageFetcher } from '../../../core/ports/web-page-fetcher.port';
import {
  ForbiddenError,
  NotFoundError,
  RateLimitedError,
} from '../../../core/errors/domain-errors';
import { logger } from '../../../core/logger/logger';
import {
  VERIFICATION_STRUCTURE_SCHEMA,
  VERIFICATION_SYSTEM_PROMPT,
  type VerificationAiOutput,
} from '../../../infrastructure/ai/gemini/prompts/verification.prompt';
import { type AiQuotaService, type UsageAccumulator } from '../../ai/services/ai-quota.service';
import { type CompanyRepository } from '../repositories/company.repository';
import { type CompanyVerificationRepository } from '../repositories/company-verification.repository';
import { type CompanyVerificationDoc } from '../models/company-verification.model';
import { type CompanyDoc } from '../models/company.model';
import { CompanyMapper } from '../mappers/company.mapper';
import { VerificationScorer } from './verification-scorer';

const DAY_MS = 24 * 60 * 60 * 1000;
const SECOND_LEVEL = new Set(['co', 'com', 'org', 'net', 'gov', 'edu', 'ac']);

interface Actor {
  id: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO';
}

export function registrableDomain(hostOrUrl: string): string {
  let host = hostOrUrl.trim().toLowerCase();
  try {
    host = new URL(host.includes('://') ? host : `https://${host}`).hostname;
  } catch {
    // keep the raw value
  }
  const parts = host
    .replace(/^www\./, '')
    .split('.')
    .filter(Boolean);
  if (parts.length <= 2) return parts.join('.');
  const second = parts[parts.length - 2] ?? '';
  const take = SECOND_LEVEL.has(second) ? 3 : 2;
  return parts.slice(-take).join('.');
}

/** A claimed source must match a grounding source by exact URL, or by domain / title (redirect links). */
export function matchesGroundingSource(url: string, sources: GroundingSource[]): boolean {
  const domain = registrableDomain(url);
  return sources.some((s) => {
    if (s.url === url) return true;
    if (registrableDomain(s.url) === domain && !/vertexaisearch|googleusercontent/i.test(s.url)) {
      return true;
    }
    return Boolean(s.title) && registrableDomain(s.title ?? '') === domain;
  });
}

export class CompanyVerificationService {
  constructor(
    private readonly ai: AiProvider,
    private readonly fetcher: WebPageFetcher,
    private readonly quota: AiQuotaService,
    private readonly companyRepo: CompanyRepository,
    private readonly verificationRepo: CompanyVerificationRepository,
  ) {}

  public async verify(
    actor: Actor,
    companyId: string,
    force: boolean,
  ): Promise<CompanyVerificationDto> {
    const company = await this.requireVisible(actor.id, companyId);
    const latest = await this.verificationRepo.findLatestForCompany(companyId);
    const isFresh =
      latest && Date.now() - latest.createdAt.getTime() < VERIFICATION_FRESH_DAYS * DAY_MS;

    // A stored result younger than 30 days is shared without a new AI call.
    if (isFresh && !force) return this.toDto(latest);

    const mine = await this.verificationRepo.findLatestByUser(companyId, actor.id);
    if (
      mine &&
      Date.now() - mine.createdAt.getTime() < VERIFICATION_RECHECK_HOURS * 60 * 60 * 1000
    ) {
      const resetsAt = new Date(
        mine.createdAt.getTime() + VERIFICATION_RECHECK_HOURS * 60 * 60 * 1000,
      );
      throw new RateLimitedError('You already re-checked this company in the last 24 hours', {
        resetsAt: resetsAt.toISOString(),
      });
    }

    const { result } = await this.quota.track(actor.id, AiFeature.COMPANY_VERIFY, (usage) =>
      this.runVerification(actor.id, company, usage),
    );

    // Side effects after the AI work, once the result is final.
    await this.companyRepo.setVerification(companyId, {
      status: VerificationScorer.status(result.score),
      score: result.score,
      checkedAt: result.createdAt,
      lastVerificationId: result._id,
    });
    return this.toDto(result);
  }

  public async list(actor: Actor, companyId: string): Promise<CompanyVerificationDto[]> {
    await this.requireVisible(actor.id, companyId);
    const rows = await this.verificationRepo.listForCompany(companyId, 10);
    return rows.map((row) => {
      const dto = this.toDto(row);
      // FREE users see status only, not the per-field details.
      return actor.plan === 'PRO' ? dto : { ...dto, fields: [], suggestions: [] };
    });
  }

  public async applySuggestions(
    actor: Actor,
    companyId: string,
    verificationId: string,
    fields: VerifiableField[],
    allowGlobal = false,
  ): Promise<CompanyDto> {
    const company = await this.requireVisible(actor.id, companyId);
    const isGlobal = company.ownerId === null;
    // Shared companies are changed through the audited admin route only
    if (isGlobal && !allowGlobal) {
      throw new ForbiddenError('Shared companies are updated from the admin area');
    }
    if (isGlobal ? actor.role !== 'ADMIN' : company.ownerId?.toString() !== actor.id) {
      throw new ForbiddenError(
        isGlobal
          ? 'Only an admin can apply suggestions to a shared company'
          : 'You can only apply suggestions to your own companies',
      );
    }

    const verification = await this.verificationRepo.findByIdForCompany(companyId, verificationId);
    if (!verification) throw new NotFoundError(undefined, 'Verification not found');

    const updates: Record<string, string> = {};
    for (const field of fields) {
      const suggestion = verification.suggestions.find((s) => s.field === field);
      if (suggestion) updates[field] = suggestion.value;
    }
    if (Object.keys(updates).length === 0) {
      throw new NotFoundError(undefined, 'No matching suggestions to apply');
    }

    const updated = await this.companyRepo.applyFields(companyId, updates, isGlobal);
    if (!updated) throw new NotFoundError(undefined, 'Company not found');

    if (isGlobal) {
      logger.info(
        {
          action: 'VERIFICATION_APPLIED',
          actorId: actor.id,
          companyId,
          fields: Object.keys(updates),
        },
        'Admin applied verification suggestions',
      );
    }
    return CompanyMapper.toDto(updated);
  }

  private async requireVisible(userId: string, companyId: string): Promise<CompanyDoc> {
    const company = await this.companyRepo.findVisibleById(userId, companyId);
    if (!company) throw new NotFoundError(undefined, 'Company not found');
    return company;
  }

  private storedValues(company: CompanyDoc): Partial<Record<VerifiableField, string>> {
    const out: Partial<Record<VerifiableField, string>> = {};
    for (const field of VERIFIABLE_FIELDS) {
      const value = company[field as keyof CompanyDoc];
      if (typeof value === 'string' && value.trim()) out[field] = value.trim();
    }
    return out;
  }

  private async runVerification(
    userId: string,
    company: CompanyDoc,
    usage: UsageAccumulator,
  ): Promise<CompanyVerificationDoc> {
    const stored = this.storedValues(company);

    // Step 2: our own fetcher checks the stored website / careers URL (direct evidence).
    const direct = new Map<'website' | 'careersUrl', string>();
    for (const field of ['website', 'careersUrl'] as const) {
      const value = stored[field];
      if (!value) continue;
      try {
        const url = value.includes('://') ? value : `https://${value}`;
        const page = await this.fetcher.fetch(url);
        if (registrableDomain(page.finalUrl) === registrableDomain(url)) {
          direct.set(field, page.finalUrl);
        }
      } catch {
        // unreachable: no direct evidence
      }
    }

    // Step 3: grounded call + structuring call (inside the provider's two-call strategy).
    let ai: VerificationAiOutput | null = null;
    let sources: GroundingSource[] = [];
    let searchCheckAvailable = true;
    let modelId = usage.model;
    try {
      const res = await this.ai.generateJson<VerificationAiOutput>({
        model: 'grounded',
        system: VERIFICATION_SYSTEM_PROMPT,
        content: JSON.stringify({ name: company.name, stored }),
        jsonSchema: VERIFICATION_STRUCTURE_SCHEMA,
        tools: ['google_search', 'url_context'],
        timeoutMs: 60_000,
      });
      usage.add(res.modelId, res.usage);
      ai = res.data;
      sources = res.groundingSources;
      modelId = res.modelId;
    } catch (err) {
      if (!(err instanceof AiToolUnavailableError)) throw err;
      searchCheckAvailable = false;
    }

    // Step 4: checks by our code.
    const results: VerificationFieldResultDto[] = [];
    const suggestions: CompanyVerificationDto['suggestions'] = [];
    for (const field of VERIFIABLE_FIELDS) {
      const storedValue = stored[field];
      if (!storedValue) continue;

      const claim = ai?.fields?.find((f) => f.field === field);
      const validSources = (claim?.sourceUrls ?? []).filter((u) =>
        matchesGroundingSource(u, sources),
      );
      let verdict: VerificationFieldResultDto['verdict'] = 'NOT_FOUND';
      let foundValue: string | null = null;

      if (
        claim &&
        (claim.verdict === 'MATCH' || claim.verdict === 'DIFFERENT') &&
        validSources.length > 0
      ) {
        verdict = claim.verdict;
        foundValue = claim.foundValue ?? null;
      }

      const directUrl =
        field === 'website' || field === 'careersUrl' ? direct.get(field) : undefined;
      const fieldSources = validSources.map((url) => ({ url }));
      if (directUrl) {
        verdict = 'MATCH';
        foundValue = storedValue;
        fieldSources.unshift({ url: directUrl });
      }

      if (verdict === 'DIFFERENT' && foundValue && validSources[0]) {
        suggestions.push({ field, value: foundValue, sourceUrl: validSources[0] });
      }
      results.push({ field, storedValue, foundValue, verdict, sources: fieldSources });
    }

    const companyExists = ai?.companyExists ?? 'UNSURE';
    const score = VerificationScorer.score({
      companyExists,
      fields: results.map((r) => ({ field: r.field, verdict: r.verdict })),
    });

    return this.verificationRepo.create({
      companyId: company._id,
      requestedBy: new Types.ObjectId(userId),
      modelId,
      fields: results,
      companyExists,
      score,
      suggestions,
      searchCheckAvailable,
    });
  }

  private toDto(row: CompanyVerificationDoc): CompanyVerificationDto {
    return {
      id: row._id.toString(),
      companyId: row.companyId.toString(),
      companyExists: row.companyExists,
      score: row.score,
      fields: row.fields.map((f) => ({
        field: f.field,
        storedValue: f.storedValue ?? null,
        foundValue: f.foundValue ?? null,
        verdict: f.verdict,
        sources: (f.sources ?? []).map((s) => ({ url: s.url, title: s.title })),
      })),
      suggestions: row.suggestions.map((s) => ({
        field: s.field,
        value: s.value,
        sourceUrl: s.sourceUrl,
      })),
      searchCheckAvailable: row.searchCheckAvailable,
      model: row.modelId,
      createdAt: row.createdAt.toISOString(),
    };
  }
}
