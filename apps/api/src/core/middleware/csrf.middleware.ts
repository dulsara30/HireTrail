import { Request, Response, NextFunction } from 'express';
import { ForbiddenError } from '../errors/domain-errors';

/**
 * Enforces CSRF mitigation headers on sensitive cookie-bearing endpoints:
 * - /auth/refresh
 * - /auth/logout
 *
 * Rules:
 * 1. Requires `X-Requested-With: hiretrail` header.
 * 2. If Origin header is present, ensures it matches allowed CORS origins or WEB_APP_URL.
 */
export function enforceCsrfHeaders(req: Request, res: Response, next: NextFunction): void {
  const customHeader = Array.isArray(req.headers['x-requested-with'])
    ? req.headers['x-requested-with'][0]
    : req.headers['x-requested-with'];
  if (!customHeader || customHeader.toLowerCase() !== 'hiretrail') {
    return next(new ForbiddenError('Missing or invalid X-Requested-With header'));
  }

  const origin = req.headers.origin;
  if (origin) {
    const allowed = (process.env.CORS_ORIGINS || process.env.WEB_APP_URL || 'http://localhost:3000')
      .split(',')
      .map((s) => s.trim().toLowerCase());

    if (!allowed.includes(origin.toLowerCase())) {
      return next(new ForbiddenError('Origin not allowed for sensitive cookie operations'));
    }
  }

  next();
}
