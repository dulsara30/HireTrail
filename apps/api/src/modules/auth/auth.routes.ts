import { Router } from 'express';
import { AuthController } from './controllers/auth.controller';
import { validate } from '../../core/middleware/validate.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  googleStartQuerySchema,
  googleCallbackQuerySchema,
} from '@hiretrail/shared';
import {
  authEndpointRateLimit,
  strictEmailRateLimit,
  refreshRateLimit,
  checkLoginLockout,
} from '../../core/middleware/rate-limit.middleware';
import { enforceCsrfHeaders } from '../../core/middleware/csrf.middleware';
import { RequestHandler } from 'express';

export function createAuthRoutes(controller: AuthController, authenticate: RequestHandler): Router {
  const router = Router();

  router.post(
    '/register',
    authEndpointRateLimit,
    validate({ body: registerSchema }),
    controller.register,
  );

  router.post(
    '/login',
    authEndpointRateLimit,
    checkLoginLockout,
    validate({ body: loginSchema }),
    controller.login,
  );

  router.post('/refresh', refreshRateLimit, enforceCsrfHeaders, controller.refresh);

  router.post('/logout', enforceCsrfHeaders, controller.logout);

  router.post('/logout-all', authenticate, controller.logoutAll);

  router.get('/google/start', validate({ query: googleStartQuerySchema }), controller.googleStart);

  router.get(
    '/google/callback',
    validate({ query: googleCallbackQuerySchema }),
    controller.googleCallback,
  );

  router.post('/google/link', authenticate, controller.googleLink);

  router.post('/email/verify', validate({ body: verifyEmailSchema }), controller.verifyEmail);

  router.post('/email/resend', authenticate, strictEmailRateLimit, controller.resendVerification);

  router.post(
    '/password/forgot',
    strictEmailRateLimit,
    validate({ body: forgotPasswordSchema }),
    controller.forgotPassword,
  );

  router.post('/password/reset', validate({ body: resetPasswordSchema }), controller.resetPassword);

  return router;
}
