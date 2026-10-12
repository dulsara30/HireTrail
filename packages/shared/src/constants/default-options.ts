import { ClosedReason, OptionType, StatusCategory, type OptionColor } from './options';

export interface DefaultOptionDefinition {
  type: OptionType;
  key: string;
  label: string;
  color: OptionColor;
  order: string;
  meta?: Record<string, unknown>;
  aliases?: string[];
}

type Row = [label: string, color: OptionColor, extra?: Partial<DefaultOptionDefinition>];

const keyOf = (label: string): string =>
  label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');

/** Builds ordered definitions ('a0', 'a1', ...) from compact rows. */
function build(type: OptionType, rows: Row[]): DefaultOptionDefinition[] {
  return rows.map(([label, color, extra], index) => ({
    type,
    key: keyOf(label),
    label,
    color,
    order: `a${index}`,
    ...extra,
  }));
}

const status = (
  category: StatusCategory,
  closedReason?: ClosedReason,
): Partial<DefaultOptionDefinition> => ({
  meta: closedReason ? { category, closedReason } : { category },
});

/** Single source of default options, seeded at sign-up and restored by "reset defaults". */
export const DEFAULT_OPTIONS: DefaultOptionDefinition[] = [
  ...build(OptionType.STATUS, [
    ['Saved', 'neutral', { ...status(StatusCategory.SAVED), aliases: ['wishlist', 'bookmarked'] }],
    ['Applied', 'accent', { ...status(StatusCategory.APPLIED), aliases: ['submitted'] }],
    [
      'Screening',
      'info',
      { ...status(StatusCategory.IN_PROGRESS), aliases: ['recruiter call', 'hr screen'] },
    ],
    [
      'Interview 1',
      'purple',
      { ...status(StatusCategory.INTERVIEW), aliases: ['interview', 'first interview'] },
    ],
    [
      'Interview 2',
      'purple',
      { ...status(StatusCategory.INTERVIEW), aliases: ['final interview'] },
    ],
    [
      'Technical Test',
      'orange',
      { ...status(StatusCategory.IN_PROGRESS), aliases: ['assessment', 'coding test'] },
    ],
    ['Offer', 'success', { ...status(StatusCategory.OFFER), aliases: ['offered'] }],
    ['Accepted', 'teal', status(StatusCategory.ACCEPTED)],
    [
      'Rejected',
      'danger',
      { ...status(StatusCategory.CLOSED, ClosedReason.REJECTED), aliases: ['declined'] },
    ],
    [
      'Ghosted',
      'neutral',
      { ...status(StatusCategory.CLOSED, ClosedReason.GHOSTED), aliases: ['no response'] },
    ],
    ['Withdrawn', 'neutral', status(StatusCategory.CLOSED, ClosedReason.WITHDRAWN)],
  ]),
  ...build(OptionType.PRIORITY, [
    ['High', 'accent', { meta: { rank: 3 } }],
    ['Medium', 'info', { meta: { rank: 2 } }],
    ['Low', 'neutral', { meta: { rank: 1 } }],
  ]),
  ...build(OptionType.JOB_TYPE, [
    ['Internship', 'purple', { aliases: ['intern', 'trainee', 'apprenticeship'] }],
    ['Full-time', 'success', { aliases: ['full time', 'permanent'] }],
    ['Contract', 'orange', { aliases: ['contractual', 'fixed term', 'freelance'] }],
    ['Part-time', 'info', { aliases: ['part time'] }],
  ]),
  ...build(OptionType.LEVEL, [
    ['Intern', 'purple', { aliases: ['internship', 'trainee'] }],
    ['Junior', 'info', { aliases: ['jr', 'entry level', 'graduate', 'associate'] }],
    ['Mid', 'teal', { aliases: ['mid level', 'intermediate'] }],
    ['Senior', 'accent', { aliases: ['sr', 'lead'] }],
  ]),
  ...build(OptionType.WORK_MODE, [
    ['Onsite', 'neutral', { aliases: ['on-site', 'on site', 'office', 'in-person'] }],
    ['Hybrid', 'purple', { aliases: ['flexible', 'partially remote'] }],
    ['Remote', 'teal', { aliases: ['wfh', 'work from home', 'telecommute'] }],
  ]),
  ...build(OptionType.SOURCE, [
    ['LinkedIn', 'info'],
    ['Company Website', 'accent', { aliases: ['careers page', 'company site'] }],
    ['Referral', 'success', { aliases: ['referred'] }],
    ['Job Board', 'orange', { aliases: ['topjobs', 'itpro', 'indeed', 'glassdoor'] }],
    ['Email', 'purple'],
    [
      'University/Career Fair',
      'teal',
      { aliases: ['university', 'career fair', 'job fair', 'campus'] },
    ],
    ['Other', 'neutral'],
  ]),
  ...build(OptionType.CV_VERSION, [
    ['Master', 'accent'],
    ['Java-Spring', 'orange'],
    ['Frontend-React', 'info'],
    ['Full-Stack', 'purple'],
    ['.NET', 'teal', { key: 'dotnet' }],
    ['Other', 'neutral'],
    ['Customized', 'success'],
  ]),
];
