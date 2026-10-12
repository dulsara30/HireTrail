import { IMPORT_FIELDS, type ImportField } from '@hiretrail/shared';
import { normalizeToken } from '../../ai/services/option-matcher';
import { parseUnambiguousDate } from '../../ai/services/autofill-normalizer';

export type ImportMapping = Partial<Record<ImportField, string>>;
export type OptionImportField =
  'status' | 'priority' | 'workMode' | 'jobType' | 'level' | 'source' | 'cvVersion';

export const OPTION_FIELD_TYPE: Record<OptionImportField, string> = {
  status: 'STATUS',
  priority: 'PRIORITY',
  workMode: 'WORK_MODE',
  jobType: 'JOB_TYPE',
  level: 'LEVEL',
  source: 'SOURCE',
  cvVersion: 'CV_VERSION',
};

const SYNONYMS: Record<ImportField, string[]> = {
  company: ['company', 'companyname', 'employer', 'organization', 'organisation'],
  roleTitle: ['roletitle', 'role', 'title', 'jobtitle', 'position'],
  status: ['status', 'stage'],
  priority: ['priority'],
  workMode: ['workmode', 'worktype', 'mode'],
  jobType: ['jobtype', 'employmenttype', 'type'],
  level: ['level', 'experiencelevel', 'seniority'],
  source: ['source', 'applicationsource', 'platform'],
  cvVersion: ['cvversion', 'cv', 'resume', 'resumeversion'],
  coverLetter: ['coverletter'],
  location: ['location', 'city'],
  jobUrl: ['joblink', 'jobUrl', 'link', 'url', 'joburl'],
  contactEmail: ['contactemail', 'email', 'recruiteremail', 'hremail'],
  resumeUrl: ['resumelink', 'resumeurl', 'cvlink', 'resumedrive'],
  salaryMin: ['salarymin', 'minsalary', 'minimumsalary'],
  salaryMax: ['salarymax', 'maxsalary', 'maximumsalary'],
  salaryCurrency: ['salarycurrency', 'currency'],
  salaryPeriod: ['salaryperiod', 'period'],
  expectedSalary: ['expectedsalary', 'expectation', 'myexpectation'],
  appliedDate: ['applieddate', 'dateapplied', 'applied'],
  deadline: ['deadline', 'closingdate', 'applyby'],
  followUp: ['followup', 'followupdate'],
  jobDescription: ['jobdescription', 'description', 'jd'],
  notes: ['notes', 'note', 'comments'],
};

/** Suggests a field for each CSV header by name. Each header and each field is used once. */
export function suggestMapping(headers: string[]): ImportMapping {
  const mapping: ImportMapping = {};
  const used = new Set<string>();
  for (const field of IMPORT_FIELDS) {
    const header = headers.find(
      (h) => !used.has(h) && SYNONYMS[field].map(normalizeToken).includes(normalizeToken(h)),
    );
    if (header) {
      mapping[field] = header;
      used.add(header);
    }
  }
  return mapping;
}

export class ImportRowError extends Error {}

const toMinor = (raw: string, label: string): number => {
  const n = Number(raw.replace(/[,\s]/g, ''));
  if (!Number.isFinite(n) || n < 0) throw new ImportRowError(`${label} "${raw}" is not a number`);
  return Math.round(n * 100);
};

const toDate = (raw: string, label: string): Date => {
  const iso = parseUnambiguousDate(raw);
  if (!iso) throw new ImportRowError(`${label} "${raw}" is not a clear date (use YYYY-MM-DD)`);
  return new Date(iso);
};

const PERIODS: Record<string, 'HOUR' | 'MONTH' | 'YEAR'> = {
  hour: 'HOUR',
  hourly: 'HOUR',
  month: 'MONTH',
  monthly: 'MONTH',
  year: 'YEAR',
  yearly: 'YEAR',
  annual: 'YEAR',
  annually: 'YEAR',
};

export interface MappedRow {
  company: string;
  roleTitle: string;
  /** Option labels exactly as written in the file. */
  options: Partial<Record<OptionImportField, string>>;
  coverLetter: boolean;
  location?: string;
  jobUrl?: string;
  contactEmail?: string;
  resumeUrl?: string;
  jobDescription?: string;
  notes?: string;
  salary?: {
    min?: number;
    max?: number;
    currency?: string;
    period?: 'HOUR' | 'MONTH' | 'YEAR';
    expected?: number;
  };
  dates: { appliedAt?: Date; deadlineAt?: Date; followUpAt?: Date };
}

export class ImportRowMapper {
  /** Pure: turns one CSV row into typed values. Throws ImportRowError with a readable message. */
  public static map(row: Record<string, string>, mapping: ImportMapping): MappedRow {
    const get = (field: ImportField): string => {
      const header = mapping[field];
      return header ? (row[header] ?? '').trim() : '';
    };

    const company = get('company');
    const roleTitle = get('roleTitle');
    if (!company) throw new ImportRowError('Company is empty');
    if (!roleTitle) throw new ImportRowError('Role title is empty');

    const options: MappedRow['options'] = {};
    for (const field of Object.keys(OPTION_FIELD_TYPE) as OptionImportField[]) {
      const value = get(field);
      if (value) options[field] = value;
    }

    const cover = get('coverLetter').toLowerCase();
    const mapped: MappedRow = {
      company,
      roleTitle,
      options,
      coverLetter: ['yes', 'y', 'true', '1'].includes(cover),
      dates: {},
    };

    if (get('location')) mapped.location = get('location');
    if (get('jobUrl')) mapped.jobUrl = get('jobUrl');
    if (get('contactEmail')) mapped.contactEmail = get('contactEmail');
    if (get('resumeUrl')) mapped.resumeUrl = get('resumeUrl');
    if (get('jobDescription')) mapped.jobDescription = get('jobDescription');
    if (get('notes')) mapped.notes = get('notes');

    const min = get('salaryMin');
    const max = get('salaryMax');
    const expected = get('expectedSalary');
    if (min || max || expected) {
      const currency = get('salaryCurrency').toUpperCase();
      if (currency && !/^[A-Z]{3}$/.test(currency)) {
        throw new ImportRowError(`Currency "${currency}" must be a 3-letter code`);
      }
      const periodRaw = get('salaryPeriod').toLowerCase();
      const period = periodRaw ? PERIODS[periodRaw] : undefined;
      if (periodRaw && !period)
        throw new ImportRowError(`Salary period "${periodRaw}" is not valid`);
      mapped.salary = {
        ...(min ? { min: toMinor(min, 'Salary min') } : {}),
        ...(max ? { max: toMinor(max, 'Salary max') } : {}),
        ...(expected ? { expected: toMinor(expected, 'Expected salary') } : {}),
        ...(currency ? { currency } : {}),
        ...(period ? { period } : {}),
      };
    }

    if (get('appliedDate')) mapped.dates.appliedAt = toDate(get('appliedDate'), 'Applied date');
    if (get('deadline')) mapped.dates.deadlineAt = toDate(get('deadline'), 'Deadline');
    if (get('followUp')) mapped.dates.followUpAt = toDate(get('followUp'), 'Follow-up date');
    return mapped;
  }
}
