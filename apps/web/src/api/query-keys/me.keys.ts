export const ME_KEYS = {
  all: ['me'] as const,
  profile: () => [...ME_KEYS.all, 'profile'] as const,
  sessions: () => [...ME_KEYS.all, 'sessions'] as const,
};
