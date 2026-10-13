import { type AdminCreateCompanyInput, type CompanyLookupDto } from '@hiretrail/shared';

export interface AdminCreateFormValues {
  name: string;
  website: string;
  careersUrl: string;
  country: string;
  city: string;
  industry: string;
  size: string;
  description: string;
  linkedinUrl: string;
  contactEmail: string;
  foundedYear: string;
  techStack: string;
  region: '' | 'LOCAL' | 'FOREIGN';
  tier: '' | 'A' | 'B';
}

export const EMPTY_CREATE_FORM: AdminCreateFormValues = {
  name: '',
  website: '',
  careersUrl: '',
  country: '',
  city: '',
  industry: '',
  size: '',
  description: '',
  linkedinUrl: '',
  contactEmail: '',
  foundedYear: '',
  techStack: '',
  region: '',
  tier: '',
};

/** Pre-fills the add-company form with what a lookup found. Values without a public source are already empty. */
export function lookupToFormValues(
  lookup: CompanyLookupDto,
  searched: string,
): AdminCreateFormValues {
  const p = lookup.profile;
  if (!lookup.found || !p) return { ...EMPTY_CREATE_FORM, name: searched.trim() };
  return {
    ...EMPTY_CREATE_FORM,
    name: p.name,
    website: p.website ?? '',
    careersUrl: p.careersUrl ?? '',
    country: p.country ?? '',
    city: p.city ?? '',
    industry: p.industry ?? '',
    size: p.size ?? '',
    description: p.description ?? '',
    linkedinUrl: p.linkedinUrl ?? '',
    contactEmail: p.contactEmail ?? '',
    foundedYear: p.foundedYear ?? '',
    techStack: (p.techStack ?? []).join(', '),
  };
}

const orNull = (value: string): string | null => value.trim() || null;

/** Builds the create request. `lookup` is the result the form was filled from, or null for a manual entry. */
export function formValuesToCreateInput(
  values: AdminCreateFormValues,
  lookup: CompanyLookupDto | null,
  reason: string,
): AdminCreateCompanyInput {
  const fromLookup = Boolean(lookup?.found && lookup.profile);
  return {
    name: values.name.trim(),
    website: orNull(values.website),
    careersUrl: orNull(values.careersUrl),
    country: orNull(values.country),
    city: orNull(values.city),
    industry: orNull(values.industry),
    size: orNull(values.size),
    description: orNull(values.description),
    linkedinUrl: orNull(values.linkedinUrl),
    contactEmail: orNull(values.contactEmail),
    foundedYear: orNull(values.foundedYear),
    techStack: Array.from(
      new Set(
        values.techStack
          .split(',')
          .map((item) => item.trim())
          .filter(Boolean),
      ),
    ),
    region: values.region || null,
    tier: values.tier || null,
    fromAiLookup: fromLookup,
    sourceUrls: fromLookup ? (lookup?.sources ?? []).map((s) => s.url).slice(0, 10) : [],
    reason: reason.trim(),
  };
}
