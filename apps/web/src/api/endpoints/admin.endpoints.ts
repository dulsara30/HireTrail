export const ADMIN_ENDPOINTS = {
  users: '/admin/users',
  user: (id: string) => `/admin/users/${id}`,
  userPlan: (id: string) => `/admin/users/${id}/plan`,
  userStatus: (id: string) => `/admin/users/${id}/status`,
  companies: '/admin/companies',
  lookupCompany: '/admin/companies/lookup',
  company: (id: string) => `/admin/companies/${id}`,
  mergeCompany: (id: string) => `/admin/companies/${id}/merge`,
  auditLogs: '/admin/audit-logs',
  aiUsage: '/admin/ai-usage',
  aiHealth: '/admin/ai-health',
} as const;

export const DATA_ENDPOINTS = {
  exportApplications: '/applications/export',
  importPreview: '/applications/import/preview',
  importCommit: '/applications/import/commit',
  exportAccount: '/me/export',
  insights: '/dashboard/insights',
  refreshInsights: '/dashboard/insights/refresh',
} as const;
