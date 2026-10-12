export const companyKeys = {
  all: ['companies'] as const,
  searches: () => [...companyKeys.all, 'search'] as const,
  search: (q?: string) => [...companyKeys.searches(), { q }] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (id: string) => [...companyKeys.details(), id] as const,
};
