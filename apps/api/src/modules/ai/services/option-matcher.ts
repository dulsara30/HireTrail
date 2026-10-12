import { type OptionDoc } from '../../options/models/option.model';

export type MatchableOptionType = 'WORK_MODE' | 'JOB_TYPE' | 'LEVEL';

const SYNONYMS: Record<string, string[]> = {
  remote: ['remote', 'fullyremote', 'workfromhome', 'wfh', 'workfromanywhere'],
  onsite: ['onsite', 'inoffice', 'office', 'onpremise', 'onpremises'],
  hybrid: ['hybrid', 'flexible'],
  fulltime: ['fulltime', 'permanent', 'regular'],
  parttime: ['parttime'],
  contract: ['contract', 'contractual', 'fixedterm', 'freelance'],
  internship: ['internship', 'intern', 'trainee', 'apprenticeship'],
  junior: ['junior', 'jr', 'entrylevel', 'graduate'],
  associate: ['associate'],
  mid: ['mid', 'midlevel', 'intermediate'],
  senior: ['senior', 'sr'],
  lead: ['lead', 'teamlead', 'staff'],
  principal: ['principal'],
};

export function normalizeToken(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function canonOf(value: string): string | null {
  const token = normalizeToken(value);
  for (const [canon, words] of Object.entries(SYNONYMS)) {
    if (words.includes(token)) return canon;
  }
  return null;
}

/** Matches AI text to one of the user's own options: exact label/key/alias, then synonyms, then containment. */
export class OptionMatcher {
  public static match(options: OptionDoc[], text: string | null | undefined): OptionDoc | null {
    if (!text) return null;
    const token = normalizeToken(text);
    if (!token) return null;
    const active = options.filter((o) => !o.archivedAt);

    // 1. exact label, key or alias
    const exact = active.find(
      (o) =>
        normalizeToken(o.label) === token ||
        normalizeToken(o.key) === token ||
        (o.aliases ?? []).some((a) => normalizeToken(a) === token),
    );
    if (exact) return exact;

    // 2. synonym group
    const canon = canonOf(text);
    if (canon) {
      const viaSynonym = active.find((o) => {
        const names = [o.label, o.key, ...(o.aliases ?? [])];
        return names.some((n) => canonOf(n) === canon);
      });
      if (viaSynonym) return viaSynonym;
    }

    // 3. containment, only for labels long enough to be meaningful
    return (
      active.find((o) => {
        const label = normalizeToken(o.label);
        return label.length >= 4 && (token.includes(label) || label.includes(token));
      }) ?? null
    );
  }
}
