import {
  AI_TEXT_MAX,
  AiFeature,
  type AutofillDraftDto,
  type AutofillFieldKey,
  type AutofillRequestInput,
} from '@hiretrail/shared';
import { type AiProvider, AiToolUnavailableError } from '../../../core/ports/ai-provider.port';
import { type WebPageFetcher } from '../../../core/ports/web-page-fetcher.port';
import { SourceUnreachableError } from '../../../core/errors/domain-errors';
import { ContentExtractor } from '../../../infrastructure/fetcher/content-extractor';
import {
  AUTOFILL_JSON_SCHEMA,
  AUTOFILL_SYSTEM_PROMPT,
  URL_CONTEXT_SYSTEM_PROMPT,
  URL_TEXT_JSON_SCHEMA,
  type AutofillAiField,
  type AutofillAiFieldKey,
  type AutofillAiOutput,
} from '../../../infrastructure/ai/gemini/prompts/autofill.prompt';
import { type OptionRepository } from '../../options/repositories/option.repository';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { type AiQuotaService, type UsageAccumulator } from './ai-quota.service';
import { OptionMatcher, type MatchableOptionType } from './option-matcher';
import { isEvidenceValid, parseSalary, parseUnambiguousDate } from './autofill-normalizer';

const MIN_URL_TEXT_CHARS = 300;
const SHORT_TEXT_CHARS = 400;
const LINK_REGEX = /https?:\/\/[^\s<>"')]+/i;

type Warning = AutofillDraftDto['warnings'][number];

export class AutofillService {
  constructor(
    private readonly ai: AiProvider,
    private readonly fetcher: WebPageFetcher,
    private readonly quota: AiQuotaService,
    private readonly optionRepo: OptionRepository,
    private readonly companyRepo: CompanyRepository,
  ) {}

  /** Builds a draft from a job post. Nothing is saved except the aiUsage row. */
  public async autofill(userId: string, input: AutofillRequestInput): Promise<AutofillDraftDto> {
    const { result, usageId } = await this.quota.track(userId, AiFeature.AUTOFILL, (usage) =>
      this.buildDraft(userId, input, usage),
    );
    return { ...result, aiUsageId: usageId };
  }

  private async buildDraft(
    userId: string,
    input: AutofillRequestInput,
    usage: UsageAccumulator,
  ): Promise<AutofillDraftDto> {
    const warnings: Warning[] = [];
    const source = await this.getSource(input, usage);

    const extraction = await this.ai.generateJson<AutofillAiOutput>({
      model: 'extract',
      system: AUTOFILL_SYSTEM_PROMPT,
      content: source.text,
      jsonSchema: AUTOFILL_JSON_SCHEMA,
      timeoutMs: 25_000,
    });
    usage.add(extraction.modelId, extraction.usage);

    const empty = this.emptyDraft(source.text, source.url);
    const output = extraction.data;
    if (!output?.isJobPost) {
      return {
        ...empty,
        warnings: [{ field: 'general', message: 'This does not look like a job post.' }],
      };
    }

    // Evidence check: values the source does not prove are dropped and flagged.
    const verified = new Map<AutofillAiFieldKey, string>();
    const evidence: Partial<Record<AutofillFieldKey, string>> = {};
    const keep = (key: AutofillAiFieldKey, draftKey?: AutofillFieldKey): string | null => {
      const field = output.fields?.[key] as AutofillAiField | null | undefined;
      if (!field?.value) return null;
      if (!isEvidenceValid(source.text, field.value, field.evidence)) {
        warnings.push({
          field: draftKey ?? (key as AutofillFieldKey),
          message: `Couldn't confirm "${key}" in the job text, so it was left empty.`,
        });
        return null;
      }
      verified.set(key, field.value);
      if (draftKey) evidence[draftKey] = field.evidence;
      return field.value;
    };

    const companyName = keep('companyName', 'companyName');
    const roleTitle = keep('roleTitle', 'roleTitle');
    const location = keep('location', 'location');
    const workMode = keep('workMode', 'workModeId');
    const jobType = keep('jobType', 'jobTypeId');
    const level = keep('level', 'levelId');
    const applyUrl = keep('applyUrl', 'jobUrl');
    const rawEmail = keep('applyEmail', 'contactEmail');
    const contactEmail =
      rawEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(rawEmail) ? rawEmail.toLowerCase() : null;
    if (rawEmail && !contactEmail) delete evidence.contactEmail;
    const salaryText = keep('salaryText', 'salary');
    const deadlineText = keep('deadlineText', 'deadlineAt');

    const suggestedOptions: AutofillDraftDto['suggestedOptions'] = [];
    const options = await this.optionRepo.findAllForUser(userId, false);
    const matchOption = (
      type: MatchableOptionType,
      text: string | null,
      draftKey: AutofillFieldKey,
    ): string | null => {
      if (!text) return null;
      const match = OptionMatcher.match(
        options.filter((o) => o.type === type),
        text,
      );
      if (match) return match._id.toString();
      suggestedOptions.push({ type, label: text });
      delete evidence[draftKey];
      return null;
    };

    const workModeId = matchOption('WORK_MODE', workMode, 'workModeId');
    const jobTypeId = matchOption('JOB_TYPE', jobType, 'jobTypeId');
    const levelId = matchOption('LEVEL', level, 'levelId');

    // Company: directory match (normalised name or alias), else flagged as a new company.
    let companyId: string | null = null;
    if (companyName) {
      const byName = await this.companyRepo.findVisibleByNormalizedName(
        userId,
        CompanyRepository.normalizeName(companyName),
      );
      const found = byName ?? (await this.companyRepo.findVisibleByAlias(userId, companyName));
      companyId = found ? found._id.toString() : null;
    }

    let salary: AutofillDraftDto['salary'] = null;
    if (salaryText) {
      salary = parseSalary(salaryText);
      if (!salary) {
        warnings.push({
          field: 'salary',
          message: 'Salary text found but no amount was explicit.',
        });
        delete evidence.salary;
      } else {
        if (!salary.currency) {
          warnings.push({ field: 'salary', message: 'Currency is not stated. Please set it.' });
        }
        if (!salary.period) {
          warnings.push({ field: 'salary', message: 'Pay period is not stated. Please set it.' });
        }
      }
    }

    let deadlineAt: string | null = null;
    if (deadlineText) {
      deadlineAt = parseUnambiguousDate(deadlineText);
      if (!deadlineAt) {
        warnings.push({
          field: 'deadlineAt',
          message: `Deadline "${deadlineText}" is ambiguous. Please set the date yourself.`,
        });
        delete evidence.deadlineAt;
      }
    }

    // Skills are kept only if each one appears in the source.
    const sourceLower = source.text.toLowerCase();
    const skills = (output.fields?.skills ?? [])
      .filter((s): s is string => typeof s === 'string' && s.trim().length > 0)
      .filter((s) => sourceLower.includes(s.toLowerCase()))
      .slice(0, 25);

    if (source.text.length < SHORT_TEXT_CHARS && !source.merged) {
      warnings.push({
        field: 'general',
        message: 'The text is short, so some fields may be missing.',
      });
    }

    const draft: AutofillDraftDto = {
      ...empty,
      isJobPost: true,
      companyName,
      companyId,
      isNewCompany: Boolean(companyName) && !companyId,
      roleTitle,
      location,
      jobUrl: applyUrl ?? source.url,
      contactEmail,
      workModeId,
      jobTypeId,
      levelId,
      salary,
      deadlineAt,
      skills,
      evidence,
      warnings,
      suggestedOptions,
    };
    draft.aiFilledFields = (
      [
        ['companyName', companyName],
        ['roleTitle', roleTitle],
        ['location', location],
        ['workModeId', workModeId],
        ['jobTypeId', jobTypeId],
        ['levelId', levelId],
        ['jobUrl', applyUrl],
        ['contactEmail', contactEmail],
        ['salary', salary],
        ['deadlineAt', deadlineAt],
      ] as Array<[AutofillFieldKey, unknown]>
    )
      .filter(([, v]) => v !== null && v !== undefined)
      .map(([k]) => k);
    return draft;
  }

  private emptyDraft(sourceText: string, sourceUrl: string | null): AutofillDraftDto {
    return {
      aiUsageId: '',
      isJobPost: false,
      sourceText,
      sourceUrl,
      companyName: null,
      companyId: null,
      isNewCompany: false,
      roleTitle: null,
      location: null,
      jobUrl: null,
      contactEmail: null,
      workModeId: null,
      jobTypeId: null,
      levelId: null,
      salary: null,
      deadlineAt: null,
      skills: [],
      evidence: {},
      aiFilledFields: [],
      warnings: [],
      suggestedOptions: [],
    };
  }

  /** Pasted text, or a fetched page (with URL Context fallback), optionally merged with a link in short text. */
  private async getSource(
    input: AutofillRequestInput,
    usage: UsageAccumulator,
  ): Promise<{ text: string; url: string | null; merged: boolean }> {
    if (input.text) {
      let text = (await ContentExtractor.stripHtml(input.text)).slice(0, AI_TEXT_MAX);
      let url: string | null = null;
      let merged = false;
      const link = text.length < SHORT_TEXT_CHARS ? LINK_REGEX.exec(text)?.[0] : undefined;
      if (link) {
        try {
          const page = await this.fetcher.fetch(link);
          if (page.textContent) {
            // Pasted text wins on conflicts, so it comes first.
            text = `${text}\n\n${page.textContent}`.slice(0, AI_TEXT_MAX);
            url = page.finalUrl;
            merged = true;
          }
        } catch {
          // The link is optional help; the pasted text is still usable.
        }
      }
      return { text, url, merged };
    }

    const url = input.url as string;
    try {
      const page = await this.fetcher.fetch(url);
      if (page.textContent.length >= MIN_URL_TEXT_CHARS) {
        return { text: page.textContent.slice(0, AI_TEXT_MAX), url: page.finalUrl, merged: false };
      }
    } catch (err) {
      if (!(err instanceof SourceUnreachableError)) throw err;
    }

    const viaAi = await this.readWithUrlContext(url, usage);
    if (viaAi.length >= MIN_URL_TEXT_CHARS) {
      return { text: viaAi.slice(0, AI_TEXT_MAX), url, merged: false };
    }
    throw new SourceUnreachableError("We couldn't read that page. Paste the job text instead.");
  }

  private async readWithUrlContext(url: string, usage: UsageAccumulator): Promise<string> {
    try {
      const res = await this.ai.generateJson<{ text: string }>({
        model: 'grounded',
        system: URL_CONTEXT_SYSTEM_PROMPT,
        content: url,
        jsonSchema: URL_TEXT_JSON_SCHEMA,
        tools: ['url_context'],
        timeoutMs: 30_000,
      });
      usage.add(res.modelId, res.usage);
      return await ContentExtractor.stripHtml(res.data?.text ?? '');
    } catch (err) {
      if (err instanceof AiToolUnavailableError) return '';
      throw err;
    }
  }
}
