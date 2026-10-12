export const OPTION_ENDPOINTS = {
  list: '/options',
  create: '/options',
  byId: (id: string) => `/options/${id}`,
  move: (id: string) => `/options/${id}/move`,
  archive: (id: string) => `/options/${id}/archive`,
  restore: (id: string) => `/options/${id}/restore`,
  resetDefaults: '/options/reset-defaults',
} as const;
