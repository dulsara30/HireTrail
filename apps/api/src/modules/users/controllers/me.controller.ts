import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { UserRepository } from '../../auth/repositories/user.repository';
import { SessionRepository } from '../../auth/repositories/session.repository';
import { PasswordHasher } from '../../../core/ports/password-hasher.port';
import { UserMapper } from '../../auth/mappers/user.mapper';
import {
  UpdateProfileInput,
  ChangePasswordInput,
  DeleteAccountInput,
  SessionDto,
  ErrorCode,
} from '@hiretrail/shared';
import {
  AuthenticationError,
  NotFoundError,
  ValidationError,
} from '../../../core/errors/domain-errors';
import { AuthCommandService } from '../../auth/services/auth-command.service';
import { AccountService } from '../services/account.service';

export class MeController extends BaseController {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly sessionRepo: SessionRepository,
    private readonly authCommandService: AuthCommandService,
    private readonly passwordHasher: PasswordHasher,
    private readonly accountService: AccountService,
  ) {
    super();
  }

  getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      // Default quotas
      const quotas = {
        autofill: 40,
        companyVerify: 20,
        companyLookup: 20,
        insights: 1,
      };

      const meDto = UserMapper.toMeDto(req.user, quotas);
      this.ok(res, meDto);
    } catch (err) {
      next(err);
    }
  };

  updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      const input = req.body as UpdateProfileInput;
      const updated = await this.userRepo.updateProfile(req.user._id, {
        name: input.name,
        preferences: input.preferences,
      });

      if (!updated) {
        throw new NotFoundError(ErrorCode.NOT_FOUND, 'User not found');
      }

      const quotas = {
        autofill: 40,
        companyVerify: 20,
        companyLookup: 20,
        insights: 1,
      };

      this.ok(res, UserMapper.toMeDto(updated, quotas));
    } catch (err) {
      next(err);
    }
  };

  changePassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.sessionId) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      const input = req.body as ChangePasswordInput;
      await this.authCommandService.changePassword(req.user._id.toString(), req.sessionId, input);

      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  getSessions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      const sessions = await this.sessionRepo.listActiveByUser(req.user._id);
      const currentSessionId = req.sessionId;

      const dtos: SessionDto[] = sessions.map((s) => ({
        id: s._id.toString(),
        userAgent: s.userAgent,
        ipHash: s.ipHash,
        lastUsedAt: s.lastUsedAt.toISOString(),
        createdAt: s.createdAt.toISOString(),
        isCurrent: s._id.toString() === currentSessionId,
      }));

      this.ok(res, dtos);
    } catch (err) {
      next(err);
    }
  };

  revokeSession = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      const sessionIdToRevoke = req.params.id as string;
      await this.sessionRepo.revokeSession(sessionIdToRevoke, 'LOGOUT');
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  deleteAccount = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }

      const input = req.body as DeleteAccountInput;

      // Verify password if user has password
      if (req.user.passwordHash) {
        if (!input.password) {
          throw new ValidationError('Password is required to delete account');
        }
        const isValid = await this.passwordHasher.verify(input.password, req.user.passwordHash);
        if (!isValid) {
          throw new AuthenticationError('Invalid password', ErrorCode.INVALID_CREDENTIALS);
        }
      } else {
        // Google-only user requires confirmText: 'DELETE'
        if (input.confirmText !== 'DELETE') {
          throw new ValidationError("Please type 'DELETE' to confirm account deletion");
        }
      }

      // One transaction removes the user and every collection registered in account-data.registry
      await this.accountService.deleteAccount(req.user.id as string);

      res.clearCookie('ht_rt');
      res.clearCookie('ht_signed_in');

      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  exportData = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        throw new AuthenticationError('Authentication required', ErrorCode.UNAUTHENTICATED);
      }
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="hiretrail-export-${stamp}.zip"`);
      res.setHeader('Cache-Control', 'no-store');
      await this.accountService.writeExportZip(req.user, res);
    } catch (err) {
      // Headers may already be sent while streaming: abort the response instead of a JSON error
      if (res.headersSent) {
        res.destroy(err as Error);
        return;
      }
      next(err);
    }
  };
}
