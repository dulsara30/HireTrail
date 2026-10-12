export enum AiFeature {
  AUTOFILL = 'AUTOFILL',
  COMPANY_VERIFY = 'COMPANY_VERIFY',
  COMPANY_LOOKUP = 'COMPANY_LOOKUP',
  INSIGHTS = 'INSIGHTS',
}

export const AI_TEXT_MAX = 30000;
export const VERIFICATION_FRESH_DAYS = 30;
export const VERIFICATION_RECHECK_HOURS = 24;
export const LOOKUP_CACHE_DAYS = 7;

export const VERIFIABLE_FIELDS = [
  'website',
  'careersUrl',
  'country',
  'city',
  'industry',
  'contactEmail',
  'foundedYear',
] as const;
export type VerifiableField = (typeof VERIFIABLE_FIELDS)[number];
