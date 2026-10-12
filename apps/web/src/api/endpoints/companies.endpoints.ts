export const COMPANY_ENDPOINTS = {
  search: '/companies',
  create: '/companies',
  byId: (id: string) => `/companies/${id}`,
} as const;
