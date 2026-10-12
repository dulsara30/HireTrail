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
