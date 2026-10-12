import { type AutofillDraftDto, type CreateApplicationInput } from '@hiretrail/shared';

export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** The original pasted/fetched text is saved as the job description, never a rewrite. */
export function sourceTextToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .filter((block) => block.trim().length > 0)
    .map((block) => `<p>${escapeHtml(block.trim()).replace(/\n/g, '<br>')}</p>`)
    .join('');
}

export function dollarsToMinor(value: string): number | null {
  const n = Number(value.replace(/,/g, ''));
  return Number.isFinite(n) && value.trim() !== '' ? Math.round(n * 100) : null;
}

export function minorToDollars(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : String(value / 100);
}

/** True when the pasted input is just one web link (so it is sent as a url, not as text). */
export function looksLikeUrl(input: string): boolean {
  const trimmed = input.trim();
  return /^https?:\/\/\S+$/i.test(trimmed);
}

/** A blank draft: the manual "create" form uses the same form as the AI preview. */
export function emptyDraft(): AutofillDraftDto {
  return {
    aiUsageId: '',
    isJobPost: true,
    sourceText: '',
    sourceUrl: null,
    companyName: null,
    companyId: null,
    isNewCompany: false,
    roleTitle: null,
    location: null,
    jobUrl: null,
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

export interface DraftFormValues {
  roleTitle: string;
  companyName: string;
  companyId: string;
  statusId: string;
  priorityId: string;
  location: string;
  jobUrl: string;
  workModeId: string;
  jobTypeId: string;
  levelId: string;
  sourceId: string;
  cvVersionId: string;
  coverLetter: boolean;
  salaryMin: string;
  salaryMax: string;
  currency: string;
  period: '' | 'HOUR' | 'MONTH' | 'YEAR';
  appliedAt: string;
  deadlineAt: string;
  jobDescription: string;
}

export function draftToFormValues(draft: AutofillDraftDto, statusId: string): DraftFormValues {
  return {
    roleTitle: draft.roleTitle ?? '',
    companyName: draft.companyName ?? '',
    companyId: draft.companyId ?? '',
    statusId,
    priorityId: '',
    location: draft.location ?? '',
    jobUrl: draft.jobUrl ?? '',
    workModeId: draft.workModeId ?? '',
    jobTypeId: draft.jobTypeId ?? '',
    levelId: draft.levelId ?? '',
    sourceId: '',
    cvVersionId: '',
    coverLetter: false,
    salaryMin: minorToDollars(draft.salary?.min),
    salaryMax: minorToDollars(draft.salary?.max),
    currency: draft.salary?.currency ?? '',
    period: draft.salary?.period ?? '',
    appliedAt: '',
    deadlineAt: draft.deadlineAt ?? '',
    jobDescription: draft.sourceText,
  };
}

export function formValuesToCreateInput(
  values: DraftFormValues,
  draft: AutofillDraftDto,
  editedFields: ReadonlySet<string>,
): CreateApplicationInput {
  const min = dollarsToMinor(values.salaryMin);
  const max = dollarsToMinor(values.salaryMax);
  const hasSalary = min !== null || max !== null;
  const description = values.jobDescription.trim();
  const aiFilled = draft.aiFilledFields.filter((f) => !editedFields.has(f));

  return {
    roleTitle: values.roleTitle.trim(),
    companyName: values.companyName.trim(),
    companyId: values.companyId || null,
    statusId: values.statusId,
    priorityId: values.priorityId || null,
    workModeId: values.workModeId || null,
    jobTypeId: values.jobTypeId || null,
    levelId: values.levelId || null,
    sourceId: values.sourceId || null,
    cvVersionId: values.cvVersionId || null,
    coverLetter: values.coverLetter,
    labelIds: [],
    location: values.location.trim() || null,
    jobUrl: values.jobUrl.trim() || null,
    jobDescriptionHtml: description ? sourceTextToHtml(description) : null,
    salary: hasSalary
      ? {
          min,
          max,
          currency: values.currency.trim().toUpperCase() || null,
          period: values.period || null,
        }
      : null,
    dates:
      values.appliedAt || values.deadlineAt
        ? {
            ...(values.appliedAt ? { appliedAt: new Date(values.appliedAt) } : {}),
            ...(values.deadlineAt ? { deadlineAt: new Date(values.deadlineAt) } : {}),
          }
        : null,
    contacts: [],
    ai: draft.aiUsageId ? { aiUsageId: draft.aiUsageId, aiFilledFields: aiFilled } : null,
  };
}
