import { createHash, timingSafeEqual } from 'crypto';
import {
  Router,
  type NextFunction,
  type Request,
  type RequestHandler,
  type Response,
} from 'express';
import { AuthenticationError, AuthorizationError } from '../../core/errors/domain-errors';
import { type OrbitCronController } from './controllers/orbit-cron.controller';

const digest = (value: string): Buffer => createHash('sha256').update(value).digest();

/** Accepts only `Authorization: Bearer <CRON_SECRET>`. Vercel cron sends exactly this header. */
export function requireCronSecret(secret: string | undefined): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!secret) return next(new AuthorizationError('Scheduled jobs are not configured'));
    const header = req.header('authorization') ?? '';
    const given = header.startsWith('Bearer ') ? header.slice(7) : '';
    if (!given || !timingSafeEqual(digest(given), digest(secret))) {
      return next(new AuthenticationError('Invalid scheduler secret'));
    }
    next();
  };
}

export function createOrbitCronRoutes(
  controller: OrbitCronController,
  secret: string | undefined,
): Router {
  const router = Router();
  router.use(requireCronSecret(secret));
  // Vercel cron uses GET; other schedulers often use POST
  router.get('/digest', controller.digest);
  router.post('/digest', controller.digest);
  router.get('/due', controller.due);
  router.post('/due', controller.due);
  return router;
}
