import crypto from 'node:crypto';
import { Types } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ChangePasswordInput,
} from '@hiretrail/shared';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OneTimeTokenRepository } from '../repositories/one-time-token.repository';
import { OptionSeedService } from './option-seed.service';
import { PasswordHasher } from '../../../core/ports/password-hasher.port';
import { TokenSigner } from '../../../core/ports/token-signer.port';
import { Mailer } from '../../../core/ports/mailer.port';
import { withTransaction } from '../../../core/db/transaction';
import { hashToken } from '../../../core/security/token-hash';
import {
  DuplicateError,
  AuthenticationError,
  ValidationError,
} from '../../../core/errors/domain-errors';
import { UserDoc } from '../models/user.model';
import { UserMapper } from '../mappers/user.mapper';
import { AuthTokensDto, ErrorCode } from '@hiretrail/shared';

// 10-second grace window for concurrent tab refreshes
const REFRESH_GRACE_WINDOW_MS = 10 * 1000;

export interface RefreshResult {
  tokens: AuthTokensDto;
  newRefreshToken: string;
}

export class AuthCommandService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly tokenRepo: OneTimeTokenRepository,
    private readonly optionSeedService: OptionSeedService,
    private readonly passwordHasher: PasswordHasher,
    private readonly tokenSigner: TokenSigner,
    private readonly mailer: Mailer,
    private readonly webAppUrl: string,
    private readonly refreshTokenTtlDays: number,
  ) {}

  private generateRawRefreshToken(): string {
    return crypto.randomBytes(32).toString('hex'); // 256-bit random string
  }

  private generateOneTimeToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  async register(
    input: RegisterInput,
    context: { ipHash?: string; userAgent?: string },
  ): Promise<{ tokens: AuthTokensDto; rawRefreshToken: string }> {
    const existing = await this.userRepo.findByEmail(input.email);
    if (existing) {
      throw new DuplicateError('An account with this email already exists');
    }

    const passwordHash = await this.passwordHasher.hash(input.password);
    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const rawVerifyToken = this.generateOneTimeToken();
    const verifyTokenHash = hashToken(rawVerifyToken);

    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const verifyExpiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    let createdUser: UserDoc;
    let sessionId: string;

    await withTransaction(async (session) => {
      createdUser = await this.userRepo.create(
        {
          email: input.email.toLowerCase().trim(),
          passwordHash,
          name: input.name.trim(),
          role: 'USER',
          plan: 'FREE',
          status: 'ACTIVE',
          emailVerifiedAt: null,
          preferences: {
            timezone: 'Asia/Colombo',
            currency: 'LKR',
            collapsedLanes: [],
          },
          lastLoginAt: now,
        },
        session,
      );

      // Seed default options for the new user inside the same transaction
      await this.optionSeedService.seedDefaultsForUser(createdUser._id, session);

      // Create session inside transaction
      const familyId = uuidv4();
      const createdSession = await this.sessionRepo.create(
        {
          userId: createdUser._id,
          familyId,
          tokenHash,
          expiresAt,
          userAgent: context.userAgent,
          ipHash: context.ipHash,
        },
        session,
      );
      sessionId = createdSession._id.toString();

      // Create email verification one-time token inside transaction
      await this.tokenRepo.create(
        {
          userId: createdUser._id,
          purpose: 'VERIFY_EMAIL',
          tokenHash: verifyTokenHash,
          expiresAt: verifyExpiresAt,
        },
        session,
      );
    });

    // Side effect (email) executed after transaction commits
    const verifyUrl = `${this.webAppUrl}/verify-email?token=${rawVerifyToken}`;
    this.mailer
      .send({
        to: createdUser!.email,
        subject: 'Verify your HireTrail account',
        html: `<p>Hi ${createdUser!.name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        text: `Please verify your email address by visiting: ${verifyUrl}`,
      })
      .catch(() => {});

    const accessToken = this.tokenSigner.signAccessToken({
      userId: createdUser!._id.toString(),
      sessionId: sessionId!,
    });

    return {
      tokens: {
        accessToken,
        user: UserMapper.toDto(createdUser!),
      },
      rawRefreshToken,
    };
  }

  async login(
    input: LoginInput,
    context: { ipHash?: string; userAgent?: string },
  ): Promise<{ tokens: AuthTokensDto; rawRefreshToken: string }> {
    const user = await this.userRepo.findByEmail(input.email);

    if (!user || !user.passwordHash) {
      // Constant-time mitigation against user enumeration
      await this.passwordHasher.dummyVerify();
      throw new AuthenticationError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    const isValid = await this.passwordHasher.verify(input.password, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Invalid email or password', ErrorCode.INVALID_CREDENTIALS);
    }

    if (user.status === 'SUSPENDED') {
      throw new AuthenticationError('Your account has been suspended', ErrorCode.FORBIDDEN);
    }

    const rawRefreshToken = this.generateRawRefreshToken();
    const tokenHash = hashToken(rawRefreshToken);
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.refreshTokenTtlDays * 24 * 60 * 60 * 1000);
    const familyId = uuidv4();

    const session = await this.sessionRepo.create({
      userId: user._id,
      familyId,
      tokenHash,
      expiresAt,
      userAgent: context.userAgent,
      ipHash: context.ipHash,
    });

    await this.userRepo.updateLastLogin(user._id);

    const accessToken = this.tokenSigner.signAccessToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
    });

    return {
      tokens: {
        accessToken,
        user: UserMapper.toDto(user),
      },
      rawRefreshToken,
    };
  }

  /**
   * Refreshes access token and rotates refresh token.
   *
   * 10s Grace Window & Reuse Detection Behavior:
   * - Only the SHA-256 hash of the token is stored in MongoDB (no plaintext tokens stored).
   * - If an already-rotated token is received within 10 seconds of rotatedAt,
   *   it is treated as a concurrent tab race: we do NOT fork the session family or revoke it.
   *   We issue a fresh access token for the current session.
   * - If an already-rotated token is received AFTER 10 seconds, this is classified as token reuse / theft.
   *   The entire family is immediately revoked with reason REUSE_DETECTED, and 401 SESSION_REVOKED is returned.
   */
  async refresh(rawRefreshToken: string): Promise<RefreshResult> {
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.sessionRepo.findByAnyTokenHash(tokenHash);

    if (!session) {
      throw new AuthenticationError('Invalid refresh token', ErrorCode.UNAUTHENTICATED);
    }

    if (session.revokedAt) {
      throw new AuthenticationError('Session has been revoked', ErrorCode.SESSION_REVOKED);
    }

    if (new Date() > session.expiresAt) {
      throw new AuthenticationError('Session has expired', ErrorCode.SESSION_REVOKED);
    }

    // Reuse detection logic: check if the presented token is the PREVIOUS token that was already rotated
    const isRotatedToken = session.previousTokenHash === tokenHash;
    if (isRotatedToken && session.rotatedAt) {
      const msSinceRotation = Date.now() - session.rotatedAt.getTime();
      if (msSinceRotation > REFRESH_GRACE_WINDOW_MS) {
        // Outside 10s grace window -> Reuse detected -> Revoke family
        await this.sessionRepo.revokeFamily(session.familyId, 'REUSE_DETECTED');
        throw new AuthenticationError(
          'Token reuse detected. All sessions in this family revoked.',
          ErrorCode.SESSION_REVOKED,
        );
      }
      // Within 10s grace window -> concurrent tab refresh race -> reuse existing session without forking family
      const user = await this.userRepo.findById(session.userId);
      if (!user || user.status === 'SUSPENDED') {
        throw new AuthenticationError('User suspended or not found', ErrorCode.FORBIDDEN);
      }

      const accessToken = this.tokenSigner.signAccessToken({
        userId: user._id.toString(),
        sessionId: session._id.toString(),
      });

      return {
        tokens: {
          accessToken,
          user: UserMapper.toDto(user),
        },
        newRefreshToken: rawRefreshToken,
      };
    }

    // Normal rotation of active token
    const user = await this.userRepo.findById(session.userId);
    if (!user || user.status === 'SUSPENDED') {
      throw new AuthenticationError('User suspended or not found', ErrorCode.FORBIDDEN);
    }

    const newRawRefreshToken = this.generateRawRefreshToken();
    const newTokenHash = hashToken(newRawRefreshToken);

    await this.sessionRepo.rotateToken(session._id, tokenHash, newTokenHash);

    const accessToken = this.tokenSigner.signAccessToken({
      userId: user._id.toString(),
      sessionId: session._id.toString(),
    });

    return {
      tokens: {
        accessToken,
        user: UserMapper.toDto(user),
      },
      newRefreshToken: newRawRefreshToken,
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = hashToken(rawRefreshToken);
    const session = await this.sessionRepo.findByTokenHash(tokenHash);
    if (session) {
      await this.sessionRepo.revokeSession(session._id, 'LOGOUT');
    }
  }

  async logoutAll(userId: string): Promise<void> {
    await this.sessionRepo.revokeAllUserSessions(userId, 'LOGOUT_ALL');
  }

  async forgotPassword(email: string): Promise<void> {
    const user = await this.userRepo.findByEmail(email);
    if (!user) {
      // Do nothing, but return 204 identically without revealing existence
      return;
    }

    const rawToken = this.generateOneTimeToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    await this.tokenRepo.create({
      userId: user._id,
      purpose: 'RESET_PASSWORD',
      tokenHash,
      expiresAt,
    });

    const resetUrl = `${this.webAppUrl}/reset-password?token=${rawToken}`;
    this.mailer
      .send({
        to: user.email,
        subject: 'Reset your HireTrail password',
        html: `<p>Hi ${user.name},</p><p>You requested a password reset. Click the link below to set a new password:</p><p><a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 30 minutes.</p>`,
        text: `Reset your password by visiting: ${resetUrl}`,
      })
      .catch(() => {});
  }

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    const tokenHash = hashToken(input.token);
    const tokenDoc = await this.tokenRepo.findValidByTokenHash(tokenHash, 'RESET_PASSWORD');

    if (!tokenDoc) {
      throw new ValidationError('Invalid or expired password reset token');
    }

    const passwordHash = await this.passwordHasher.hash(input.newPassword);

    await withTransaction(async (session) => {
      await this.userRepo.updatePassword(tokenDoc.userId, passwordHash, session);
      await this.tokenRepo.markUsed(tokenDoc._id, session);
      // Revoke all sessions on password reset
      await this.sessionRepo.revokeAllUserSessions(
        tokenDoc.userId,
        'PASSWORD_CHANGED',
        undefined,
        session,
      );
    });
  }

  async changePassword(
    userId: string,
    currentSessionId: string,
    input: ChangePasswordInput,
  ): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || !user.passwordHash) {
      throw new AuthenticationError('Invalid credentials', ErrorCode.INVALID_CREDENTIALS);
    }

    const isValid = await this.passwordHasher.verify(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new AuthenticationError('Current password is incorrect', ErrorCode.INVALID_CREDENTIALS);
    }

    const newHash = await this.passwordHasher.hash(input.newPassword);

    await withTransaction(async (session) => {
      const userObjectId = new Types.ObjectId(userId);
      await this.userRepo.updatePassword(userObjectId, newHash, session);
      // Revoke other sessions except current
      await this.sessionRepo.revokeAllUserSessions(
        userObjectId,
        'PASSWORD_CHANGED',
        currentSessionId,
        session,
      );
    });
  }

  async verifyEmail(rawToken: string): Promise<void> {
    const tokenHash = hashToken(rawToken);
    const tokenDoc = await this.tokenRepo.findValidByTokenHash(tokenHash, 'VERIFY_EMAIL');

    if (!tokenDoc) {
      throw new ValidationError('Invalid or expired verification token', 'INVALID_TOKEN');
    }

    await withTransaction(async (session) => {
      await this.userRepo.markEmailVerified(tokenDoc.userId, session);
      await this.tokenRepo.markUsed(tokenDoc._id, session);
    });
  }

  async resendVerification(userId: string): Promise<void> {
    const user = await this.userRepo.findById(userId);
    if (!user || user.emailVerifiedAt) {
      return;
    }

    const rawToken = this.generateOneTimeToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await this.tokenRepo.create({
      userId: user._id,
      purpose: 'VERIFY_EMAIL',
      tokenHash,
      expiresAt,
    });

    const verifyUrl = `${this.webAppUrl}/verify-email?token=${rawToken}`;
    this.mailer
      .send({
        to: user.email,
        subject: 'Verify your HireTrail account',
        html: `<p>Hi ${user.name},</p><p>Please verify your email address by clicking the link below:</p><p><a href="${verifyUrl}">${verifyUrl}</a></p>`,
        text: `Verify your email by visiting: ${verifyUrl}`,
      })
      .catch(() => {});
  }
}
