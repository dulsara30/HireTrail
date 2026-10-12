import type { Plan, Role, AccountStatus } from '../../constants/plans';

export interface UserPreferencesDto {
  timezone: string;
  currency: string;
  collapsedLanes: string[];
  panelWidth?: number;
}

export interface UserDto {
  id: string;
  email: string;
  name: string;
  avatarUrl: string | null;
  role: Role;
  plan: Plan;
  status: AccountStatus;
  emailVerified: boolean;
  preferences: UserPreferencesDto;
  lastLoginAt?: string;
  createdAt: string;
}

export interface AuthTokensDto {
  accessToken: string;
  user: UserDto;
}

export interface SessionDto {
  id: string;
  userAgent?: string;
  ipHash?: string;
  lastUsedAt: string;
  createdAt: string;
  isCurrent: boolean;
}

export interface MeDto extends UserDto {
  aiQuotaRemainingToday: {
    autofill: number;
    companyVerify: number;
    companyLookup: number;
    insights: number;
  };
}
