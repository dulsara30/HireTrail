import { Request, Response, NextFunction } from 'express';
import { AuthorizationError } from '../errors/domain-errors';
import { ErrorCode } from '@hiretrail/shared';

export function requireRole(requiredRole: 'ADMIN' | 'USER') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required', ErrorCode.UNAUTHENTICATED));
    }

    if (req.user.role !== requiredRole && req.user.role !== 'ADMIN') {
      return next(new AuthorizationError('Insufficient permissions', ErrorCode.FORBIDDEN));
    }

    next();
  };
}

export function requirePlan(requiredPlan: 'PRO' | 'FREE') {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AuthorizationError('Authentication required', ErrorCode.UNAUTHENTICATED));
    }

    if (requiredPlan === 'PRO' && req.user.plan !== 'PRO') {
      return next(
        new AuthorizationError(
          'A PRO plan is required to access this feature',
          ErrorCode.PLAN_REQUIRED,
        ),
      );
    }

    next();
  };
}

export function requireVerifiedEmail(req: Request, res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new AuthorizationError('Authentication required', ErrorCode.UNAUTHENTICATED));
  }

  if (!req.user.emailVerifiedAt) {
    return next(
      new AuthorizationError(
        'Please verify your email address to perform this action',
        ErrorCode.EMAIL_NOT_VERIFIED,
      ),
    );
  }

  next();
}
