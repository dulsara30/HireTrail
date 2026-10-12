export const adminKeys = {
  all: ['admin'] as const,
  users: (filters: object) => [...adminKeys.all, 'users', filters] as const,
  user: (id: string) => [...adminKeys.all, 'user', id] as const,
  companies: (q: string) => [...adminKeys.all, 'companies', q] as const,
  audit: (filters: object) => [...adminKeys.all, 'audit', filters] as const,
  aiUsage: (days: number) => [...adminKeys.all, 'ai-usage', days] as const,
};

export const insightsKeys = {
  all: ['insights'] as const,
};
