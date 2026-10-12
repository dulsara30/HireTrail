import { type AiFeature, type VerifiableField } from '../../constants/ai';

export type AutofillFieldKey =
  | 'companyName'
  | 'roleTitle'
  | 'location'
  | 'workModeId'
  | 'jobTypeId'
  | 'levelId'
  | 'jobUrl'
  | 'salary'
  | 'deadlineAt';

export interface AutofillDraftDto {
  aiUsageId: string;
  isJobPost: boolean;
  /** The original source text; saved verbatim as the job description. */
  sourceText: string;
  sourceUrl: string | null;
  companyName: string | null;
  companyId: string | null;
  isNewCompany: boolean;
  roleTitle: string | null;
  location: string | null;
  jobUrl: string | null;
  workModeId: string | null;
  jobTypeId: string | null;
  levelId: string | null;
  salary: {
    min: number | null;
    max: number | null;
    currency: string | null;
    period: 'HOUR' | 'MONTH' | 'YEAR' | null;
  } | null;
  deadlineAt: string | null;
  skills: string[];
  /** Exact quote from the source for each filled field. */
  evidence: Partial<Record<AutofillFieldKey, string>>;
  aiFilledFields: AutofillFieldKey[];
  warnings: Array<{ field: AutofillFieldKey | 'general'; message: string }>;
  suggestedOptions: Array<{ type: 'WORK_MODE' | 'JOB_TYPE' | 'LEVEL'; label: string }>;
}

export interface AiUsageDto {
  day: string;
  resetsAt: string;
  features: Record<AiFeature, { used: number; limit: number }>;
}

export type VerificationVerdict = 'MATCH' | 'DIFFERENT' | 'NOT_FOUND';

export interface VerificationFieldResultDto {
  field: VerifiableField;
  storedValue: string | null;
  foundValue: string | null;
  verdict: VerificationVerdict;
  sources: Array<{ url: string; title?: string }>;
}

export interface CompanyVerificationDto {
  id: string;
  companyId: string;
  companyExists: 'YES' | 'NO' | 'UNSURE';
  score: number;
  fields: VerificationFieldResultDto[];
  suggestions: Array<{ field: VerifiableField; value: string; sourceUrl: string }>;
  searchCheckAvailable: boolean;
  model: string;
  createdAt: string;
}

export interface CompanyLookupDto {
  isAiResult: true;
  found: boolean;
  fromCache: boolean;
  profile: {
    name: string;
    website: string | null;
    careersUrl: string | null;
    country: string | null;
    city: string | null;
    industry: string | null;
    size: string | null;
    description: string | null;
  } | null;
  sources: Array<{ url: string; title?: string }>;
}
