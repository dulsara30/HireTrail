import jwt from 'jsonwebtoken';
import { AccessTokenPayload, TokenSigner } from '../../core/ports/token-signer.port';
import { AuthenticationError } from '../../core/errors/domain-errors';

import { ErrorCode } from '@hiretrail/shared';

export class JwtTokenSigner implements TokenSigner {
  constructor(
    private readonly secret: string,
    private readonly issuer: string,
    private readonly audience: string,
    private readonly ttlMinutes: number,
  ) {}

  signAccessToken(payload: { userId: string; sessionId: string }): string {
    return jwt.sign(
      {
        sub: payload.userId,
        sid: payload.sessionId,
      },
      this.secret,
      {
        algorithm: 'HS256',
        expiresIn: `${this.ttlMinutes}m`,
        issuer: this.issuer,
        audience: this.audience,
      },
    );
  }

  verifyAccessToken(token: string): AccessTokenPayload {
    try {
      const decoded = jwt.verify(token, this.secret, {
        algorithms: ['HS256'],
        issuer: this.issuer,
        audience: this.audience,
      }) as AccessTokenPayload;

      return decoded;
    } catch (err) {
      if (err instanceof jwt.TokenExpiredError) {
        throw new AuthenticationError('Access token has expired', ErrorCode.TOKEN_EXPIRED);
      }
      throw new AuthenticationError('Invalid access token', ErrorCode.UNAUTHENTICATED);
    }
  }
}
