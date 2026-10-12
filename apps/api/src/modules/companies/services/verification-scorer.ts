import { type VerifiableField, type VerificationVerdict } from '@hiretrail/shared';

export const VERIFICATION_WEIGHTS: Record<VerifiableField | 'companyExists', number> = {
  companyExists: 25,
  website: 20,
  careersUrl: 15,
  country: 7.5,
  city: 7.5,
  industry: 10,
  contactEmail: 10,
  foundedYear: 5,
};

const VERDICT_FACTOR: Record<Exclude<VerificationVerdict, 'NOT_CHECKED'>, number> = {
  MATCH: 1,
  NOT_FOUND: 0.5,
  DIFFERENT: 0,
};

export interface ScorerInput {
  companyExists: 'YES' | 'NO' | 'UNSURE';
  /** Only fields that have a stored value. */
  fields: Array<{ field: VerifiableField; verdict: VerificationVerdict }>;
}

/** Pure scorer: weighted verdicts rescaled to 0..100; companyExists = NO caps the score at 10. */
export class VerificationScorer {
  public static score(input: ScorerInput): number {
    const existsFactor =
      input.companyExists === 'YES' ? 1 : input.companyExists === 'UNSURE' ? 0.5 : 0;
    let earned = VERIFICATION_WEIGHTS.companyExists * existsFactor;
    let possible = VERIFICATION_WEIGHTS.companyExists;

    for (const f of input.fields) {
      // Fields that could not be checked are left out, so they neither help nor hurt the score
      if (f.verdict === 'NOT_CHECKED') continue;
      const weight = VERIFICATION_WEIGHTS[f.field];
      earned += weight * VERDICT_FACTOR[f.verdict];
      possible += weight;
    }

    const rescaled = Math.round((earned / possible) * 100);
    return input.companyExists === 'NO' ? Math.min(rescaled, 10) : rescaled;
  }

  public static status(score: number): 'VERIFIED' | 'UNVERIFIED' | 'FAILED' {
    if (score >= 80) return 'VERIFIED';
    if (score < 50) return 'FAILED';
    return 'UNVERIFIED';
  }
}
