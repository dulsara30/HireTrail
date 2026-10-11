export const ROUTES = {
  home: '/',
  dashboard: '/dashboard',
  pipeline: '/pipeline',
  applications: '/applications',
  companies: '/companies',
  company: (slug: string) => `/companies/${slug}`,
  login: '/login',
  register: '/register',
  settings: {
    profile: '/settings/profile',
    security: '/settings/security',
    pipelineFields: '/settings/pipeline-fields',
    plan: '/settings/plan',
  },
  admin: {
    users: '/admin/users',
    companies: '/admin/companies',
    audit: '/admin/audit',
    aiUsage: '/admin/ai-usage',
  },
} as const;
