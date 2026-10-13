import { ListCompaniesQuery } from '@hiretrail/shared';

export const companyKeys = {
  all: ['companies'] as const,
  lists: () => [...companyKeys.all, 'list'] as const,
  list: (filters: ListCompaniesQuery) => [...companyKeys.lists(), filters] as const,
  searches: () => [...companyKeys.all, 'search'] as const,
  search: (q?: string) => [...companyKeys.searches(), { q }] as const,
  verifications: (id: string) => [...companyKeys.all, 'verifications', id] as const,
  notes: (id: string) => [...companyKeys.all, 'notes', id] as const,
  details: () => [...companyKeys.all, 'detail'] as const,
  detail: (idOrSlug: string) => [...companyKeys.details(), idOrSlug] as const,
};
