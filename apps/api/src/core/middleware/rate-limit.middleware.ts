import { type Request, type Response, type NextFunction } from 'express';

export function ipRateLimitMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  // Phase 0 base rate-limiter hook; full MongoDB shared rate limiter configured in Phase 1
  next();
}
