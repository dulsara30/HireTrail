import { type OptionColor } from '@hiretrail/shared';

export interface VerificationLook {
  tone: OptionColor;
  label: string;
}

/** ≥ 80 green, 50-79 amber, < 50 red (docs/05-ai.md §5.2). */
export function verificationLook(score: number): VerificationLook {
  if (score >= 80) return { tone: 'success', label: 'Data looks accurate' };
  if (score >= 50) return { tone: 'accent', label: 'Some details differ' };
  return { tone: 'danger', label: 'Data may be wrong' };
}

export function daysAgo(iso: string | null | undefined, now: Date = new Date()): number | null {
  if (!iso) return null;
  const diff = now.getTime() - new Date(iso).getTime();
  return Math.max(0, Math.floor(diff / (24 * 60 * 60 * 1000)));
}

export function checkedLabel(iso: string | null | undefined): string {
  const days = daysAgo(iso);
  if (days === null) return '';
  if (days === 0) return 'checked today';
  return `checked ${days} day${days === 1 ? '' : 's'} ago`;
}

export const FIELD_LABELS: Record<string, string> = {
  website: 'Website',
  careersUrl: 'Careers page',
  country: 'Country',
  city: 'City',
  industry: 'Industry',
  contactEmail: 'Contact email',
  foundedYear: 'Founded',
};
