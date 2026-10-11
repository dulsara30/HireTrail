export enum Plan {
  FREE = 'FREE',
  PRO = 'PRO',
}

export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
}

export enum AccountStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
}

export const AI_QUOTAS = {
  FREE: {
    AUTOFILL_DAILY: 0,
    COMPANY_VERIFY_DAILY: 0,
    COMPANY_LOOKUP_DAILY: 0,
    INSIGHTS_DAILY: 0,
  },
  PRO: {
    AUTOFILL_DAILY: 40,
    COMPANY_VERIFY_DAILY: 20,
    COMPANY_LOOKUP_DAILY: 20,
    INSIGHTS_DAILY: 1,
  },
} as const;
