export const AUTH_ENDPOINTS = {
  register: '/auth/register',
  login: '/auth/login',
  refresh: '/auth/refresh',
  logout: '/auth/logout',
  logoutAll: '/auth/logout-all',
  googleStart: '/auth/google/start',
  googleCallback: '/auth/google/callback',
  googleLink: '/auth/google/link',
  emailVerify: '/auth/email/verify',
  emailResend: '/auth/email/resend',
  forgotPassword: '/auth/password/forgot',
  resetPassword: '/auth/password/reset',
} as const;
