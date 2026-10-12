export const COMPANY_ENDPOINTS = {
  list: '/companies',
  search: '/companies/search',
  create: '/companies',
  byIdOrSlug: (idOrSlug: string) => `/companies/${idOrSlug}`,
  update: (id: string) => `/companies/${id}`,
  delete: (id: string) => `/companies/${id}`,
  notes: (id: string) => `/companies/${id}/my-notes`,
  verify: (id: string) => `/companies/${id}/verify`,
  verifications: (id: string) => `/companies/${id}/verifications`,
  applySuggestions: (id: string, vid: string) => `/companies/${id}/verifications/${vid}/apply`,
  aiLookup: '/companies/ai-lookup',
} as const;
