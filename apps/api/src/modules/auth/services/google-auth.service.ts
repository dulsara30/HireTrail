import crypto from 'node:crypto';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OptionSeedService } from './option-seed.service';
import { TokenSigner } from '../../../core/ports/token-signer.port';
import { sanitizeRedirectPath } from '../../../core/security/redirect-guard';
import { hashToken } from '../../../core/security/token-hash';
import { withTransaction } from '../../../core/db/transaction';
import {
  AuthenticationError,
  ConflictError,
  ValidationError,
} from '../../../core/errors/domain-errors';
import { AuthTokensDto, ErrorCode } from '@hiretrail/shared';
import { UserMapper } from '../mappers/user.mapper';

export interface GoogleOAuthStateCookie {
  state: string;
  codeVerifier: string;
  redirect: string;
  intent?: 'SIGN_IN' | 'LINK';
  userId?: string;
  sessionId?: string;
}

export class GoogleAuthService {
  private readonly oauthClient: OAuth2Client;

  constructor(
    private readonly clientId: string | undefined,
    private readonly clientSecret: string | undefined,
    private readonly redirectUri: string | undefined,
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly optionSeedService: OptionSeedService,
    private readonly tokenSigner: TokenSigner,
    private readonly refreshTokenTtlDays: number,
  ) {
    this.oauthClient = new OAuth2Client(clientId, clientSecret, redirectUri);
  }

  generateAuthUrl(
    relativeRedirect: string = '/pipeline',
    intent: 'SIGN_IN' | 'LINK' = 'SIGN_IN',
    userId?: string,
    sessionId?: string,
  ): { url: string; stateCookie: GoogleOAuthStateCookie } {
    if (!this.clientId) {
      throw new ValidationError('Google OAuth is not configured on this server', 'CONFIG_ERROR');
    }

    const state = crypto.randomBytes(32).toString('hex');
    const codeVerifier = crypto.randomBytes(32).toString('hex');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');

    const sanitizedRedirect = sanitizeRedirectPath(relativeRedirect, '/pipeline');

    const authUrl = this.oauthClient.generateAuthUrl({
      access_type: 'offline',
      scope: ['openid', 'email', 'profile'],
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256' as unknown as undefined, // Type cast for OAuth2Client
    });

    const stateCookie: GoogleOAuthStateCookie = {
      state,
      codeVerifier,
      redirect: sanitizedRedirect,
      intent,
      userId,
      sessionId,
    };

    return { url: authUrl, stateCookie };
  }

  async handleCallback(
    code: string,
    state: string,
    cookieState: GoogleOAuthStateCookie | undefined,
    context: { ipHash?: string; userAgent?: string },
  ): Promise<{
    redirectUrl: string;
    tokens?: AuthTokensDto;
    rawRefreshToken?: string;
    errorRedirect?: string;
  }> {
    if (!cookieState || cookieState.state !== state) {
      throw new AuthenticationError('Invalid OAuth state parameter', ErrorCode.UNAUTHENTICATED);
    }

    // Exchange authorization code for tokens
    let tokens;
    try {
      const response = await this.oauthClient.getToken({
        code,
        codeVerifier: cookieState.codeVerifier,
      });
      tokens = response.tokens;
    } catch {
      throw new AuthenticationError(
        'Failed to exchange authorization code with Google',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    if (!tokens.id_token) {
      throw new AuthenticationError(
        'Missing ID token from Google response',
        ErrorCode.INVALID_CREDENTIALS,
      );
    }

    // Strictly verify Google ID token
    const ticket = await this.oauthClient.verifyIdToken({
      idToken: tokens.id_token,
      audience: this.clientId,
    });

    const payload = ticket.getPayload();
    if (!payload) {
      throw new AuthenticationError('Invalid Google token payload', ErrorCode.INVALID_CREDENTIALS);
    }

    if (!payload.email_verified) {
      throw new AuthenticationError(
        'Google account email is not verified',
        ErrorCode.EMAIL_NOT_VERIFIED,
      );
    }

    const googleSub = payload.sub;
    const email = payload.email!.toLowerCase().trim();
    const name = payload.name || 'Google User';
    const avatarUrl = payload.picture || null;

    // Handle account linking intent
    if (cookieState.intent === 'LINK') {
      if (!cookieState.userId || !cookieState.sessionId) {
        throw new AuthenticationError('Invalid linking session context', ErrorCode.SESSION_REVOKED);
      }

      // Ensure active session
      const activeSession = await this.sessionRepo.findActiveById(cookieState.sessionId);
      if (!activeSession) {
        throw new AuthenticationError('Linking session has expired', ErrorCode.SESSION_REVOKED);
      }

      // Check if google.sub is already attached to ANY other user
      const existingLinked = await this.userRepo.findByGoogleSub(googleSub);
      if (existingLinked && existingLinked._id.toString() !== cookieState.userId) {
        throw new ConflictError(
          'This Google account is already linked to another user',
          'DUPLICATE',
        );
      }

      await this.userRepo.linkGoogle(cookieState.userId, { sub: googleSub, email });
      return { redirectUrl: '/settings/security?linked=true' };
    }

    // Handle sign-in / registration
    let user = await this.userRepo.findByGoogleSub(googleSub);

    if (!user) {
      // Check if an existing account exists with this email
      const emailUser = await this.userRepo.findByEmail(email);
      if (emailUser) {
        // Do NOT auto-link! Redirect user to login with explanatory message
        return {
          redirectUrl: `/login?error=account_exists_with_password&email=${encodeURIComponent(email)}`,
        };
      }

      // Create new user (pre-verified by Google) and seed options in transaction
      const now = new Date();
      await withTransaction(async (session) => {
        user = await this.userRepo.create(
          {
            email,
            passwordHash: null, // Google-only account
            google: {
              sub: googleSub,
              email,
              linkedAt: now,
            },
            name,
            avatarUrl,
            role: 'USER',
            plan: 'FREE',
            status: 'ACTIVE',
            emailVerifiedAt: now,
            preferences: {
              timezone: 'Asia/Colombo',
              currency: 'LKR',
              collapsedLanes: [],
            },
            lastLoginAt: now,
          },
          session,
        );

        await this.optionSeedService.seedDefaultsForUser(user._id, session);
      });
    }

    if (user!.status === 'SUSPENDED') {
      throw new AuthenticationError('Your account has been suspended', ErrorCode.FORBIDDEN);
    }

    // Create session
    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(rawRefreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const familyId = uuidv4();

    const session = await this.sessionRepo.create({
      userId: user!._id,
      familyId,
      tokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipHash: context.ipHash,
    });

    await this.userRepo.updateLastLogin(user!._id);

    const accessToken = this.tokenSigner.signAccessToken({
      userId: user!._id.toString(),
      sessionId: session._id.toString(),
    });

    const redirectUrl = sanitizeRedirectPath(cookieState.redirect, '/pipeline');

    return {
      redirectUrl,
      tokens: {
        accessToken,
        user: UserMapper.toDto(user!),
      },
      rawRefreshToken,
    };
  }
}
