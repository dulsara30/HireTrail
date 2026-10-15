import type { CompanyDto } from './company.dto';

export interface AdminUserDto {
  id: string;
  email: string;
  name: string;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO';
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerified: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Metadata and counts only. Never application content. */
export interface AdminUserDetailDto extends AdminUserDto {
  hasPassword: boolean;
  googleLinked: boolean;
  planMeta: { source: string; updatedAt: string | null; reason: string | null } | null;
  counts: { applications: number; comments: number; options: number; privateCompanies: number };
  activeSessions: number;
  aiUsageThisMonth: { calls: number; failures: number; inputTokens: number; outputTokens: number };
}

export interface AuditLogDto {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  actorType: 'USER' | 'SYSTEM';
  action: string;
  targetType: string;
  targetId: string | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  createdAt: string;
}

export interface AdminCompanyDto {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  country: string | null;
  verificationScore: number | null;
  hasConflicts: boolean;
}

export interface AdminCompanyDetailDto {
  company: CompanyDto;
  version: number;
  /** Mean of every user's star rating (1 to 5), or null when nobody rated. Never says who rated. */
  averageRating: number | null;
  ratingCount: number;
}

export interface AdminAiUsageDto {
  days: Array<{
    day: string;
    calls: number;
    failures: number;
    inputTokens: number;
    outputTokens: number;
    byFeature: Record<string, number>;
  }>;
  topUsers: Array<{ userId: string; email: string | null; calls: number; failures: number }>;
}

export interface AiModelProbeDto {
  model: string;
  role: 'extract' | 'fallback' | 'search';
  ok: boolean;
  status: number | null;
  ms: number;
  message: string | null;
}

export interface AiHealthDto {
  aiEnabled: boolean;
  keyConfigured: boolean;
  probes: AiModelProbeDto[];
  /** Web search used to find real pages about a company. */
  search: {
    provider: string;
    configured: boolean;
    month: string;
    creditsUsed: number;
    budget: number;
  };
  /** Models and services skipped for a while after failing. */
  cooldowns: Array<{ key: string; until: string; reason: string }>;
}

export type AdminEmailOutcome = 'SENT' | 'SKIPPED' | 'FAILED';

export interface AdminEmailResultDto {
  sent: number;
  results: Array<{
    userId: string;
    email: string | null;
    outcome: AdminEmailOutcome;
    /** Why a person was skipped or the send failed. */
    reason: string | null;
  }>;
}

export interface AdminEmailPreviewDto {
  subject: string;
  html: string;
}
