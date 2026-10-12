import { Request, Response, NextFunction } from 'express';
import { TokenSigner } from '../ports/token-signer.port';
import { UserRepository } from '../../modules/auth/repositories/user.repository';
import { SessionRepository } from '../../modules/auth/repositories/session.repository';
import { AuthenticationError } from '../errors/domain-errors';
import { ErrorCode } from '@hiretrail/shared';

export function createAuthenticateMiddleware(
  tokenSigner: TokenSigner,
  userRepo: UserRepository,
  sessionRepo: SessionRepository,
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new AuthenticationError(
          'Missing or malformed Authorization header',
          ErrorCode.UNAUTHENTICATED,
        );
      }

      const token = authHeader.substring(7).trim();
      const payload = tokenSigner.verifyAccessToken(token);

      // Verify session exists and is not revoked
      const session = await sessionRepo.findActiveById(payload.sid);
      if (!session) {
        throw new AuthenticationError(
          'Session has been revoked or expired',
          ErrorCode.SESSION_REVOKED,
        );
      }

      // Load fresh user from DB on every request (rule: role, plan, and verified status never read from token)
      const user = await userRepo.findById(payload.sub);
      if (!user) {
        throw new AuthenticationError('User not found', ErrorCode.UNAUTHENTICATED);
      }

      if (user.status === 'SUSPENDED') {
        throw new AuthenticationError('Your account has been suspended', ErrorCode.FORBIDDEN);
      }

      // Attach to Request context
      req.user = user;
      req.sessionId = payload.sid;

      next();
    } catch (err) {
      next(err);
    }
  };
}
