export const ME_ENDPOINTS = {
  me: '/me',
  password: '/me/password',
  sessions: '/me/sessions',
  sessionById: (id: string) => `/me/sessions/${id}`,
  export: '/me/export',
} as const;
