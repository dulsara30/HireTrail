import { type AdminUpdateCompanyInput, type CompanyDto } from '@hiretrail/shared';

export const REPORT_RATING_KEYS = [
  'culture',
  'workExperience',
  'salary',
  'learning',
  'overall',
  'scale',
  'appeal',
] as const;

export type ReportRatingKey = (typeof REPORT_RATING_KEYS)[number];

export interface AdminCompanyFormValues {
  name: string;
  aliases: string;
  region: '' | 'LOCAL' | 'FOREIGN';
  tier: '' | 'A' | 'B';
  country: string;
  city: string;
  website: string;
  careersUrl: string;
  linkedinUrl: string;
  contactEmail: string;
  foundedYear: string;
  size: string;
  industry: string;
  hiringModel: string;
  techStack: string;
  description: string;
  reportRatings: Record<ReportRatingKey, string>;
}

const splitList = (value: string): string[] =>
  Array.from(
    new Set(
      value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );

const orNull = (value: string): string | null => value.trim() || null;

/** Fills the admin edit form from a company. */
export function companyToFormValues(company: CompanyDto): AdminCompanyFormValues {
  const ratings = company.reportRatings ?? {};
  return {
    name: company.name,
    aliases: (company.aliases ?? []).join(', '),
    region: company.region ?? '',
    tier: company.tier ?? '',
    country: company.country ?? '',
    city: company.city ?? '',
    website: company.websiteUrl ?? '',
    careersUrl: company.careersUrl ?? '',
    linkedinUrl: company.linkedinUrl ?? '',
    contactEmail: company.contactEmail ?? '',
    foundedYear: company.foundedYear ?? '',
    size: company.size ?? '',
    industry: company.industry ?? '',
    hiringModel: company.hiringModel ?? '',
    techStack: (company.techStack ?? []).join(', '),
    description: company.description ?? '',
    reportRatings: Object.fromEntries(
      REPORT_RATING_KEYS.map((key) => [
        key,
        ratings[key] === undefined ? '' : String(ratings[key]),
      ]),
    ) as Record<ReportRatingKey, string>,
  };
}

/** Builds the update request. Blank text fields become null, which clears them on the server. */
export function formValuesToUpdateInput(
  values: AdminCompanyFormValues,
  version: number,
  reason: string,
): AdminUpdateCompanyInput {
  const ratings: Record<string, number | null> = {};
  let hasRating = false;
  for (const key of REPORT_RATING_KEYS) {
    const raw = values.reportRatings[key].trim();
    const parsed = raw === '' ? null : Number(raw);
    ratings[key] = parsed !== null && Number.isFinite(parsed) ? parsed : null;
    if (ratings[key] !== null) hasRating = true;
  }

  return {
    name: values.name.trim(),
    aliases: splitList(values.aliases),
    region: values.region || null,
    tier: values.tier || null,
    country: orNull(values.country),
    city: orNull(values.city),
    website: orNull(values.website),
    careersUrl: orNull(values.careersUrl),
    linkedinUrl: orNull(values.linkedinUrl),
    contactEmail: orNull(values.contactEmail),
    foundedYear: orNull(values.foundedYear),
    size: orNull(values.size),
    industry: orNull(values.industry),
    hiringModel: orNull(values.hiringModel),
    techStack: splitList(values.techStack),
    description: orNull(values.description),
    reportRatings: hasRating ? ratings : null,
    version,
    reason: reason.trim(),
  };
}

/** True when any field differs from the company as it was loaded. */
export function isFormDirty(values: AdminCompanyFormValues, company: CompanyDto): boolean {
  return JSON.stringify(values) !== JSON.stringify(companyToFormValues(company));
}
