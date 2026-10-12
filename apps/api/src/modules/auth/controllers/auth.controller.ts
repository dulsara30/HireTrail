import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { AuthCommandService } from '../services/auth-command.service';
import { GoogleAuthService } from '../services/google-auth.service';
import { hashIp } from '../../../core/security/ip-hash';
import {
  RegisterInput,
  LoginInput,
  ResetPasswordInput,
  ForgotPasswordInput,
  VerifyEmailInput,
} from '@hiretrail/shared';
import {
  recordFailedLogin,
  clearFailedLogin,
} from '../../../core/middleware/rate-limit.middleware';

const REFRESH_COOKIE_NAME = 'ht_rt';
const SIGNED_IN_HINT_COOKIE = 'ht_signed_in';
const GOOGLE_STATE_COOKIE = 'ht_g_oauth';

export class AuthController extends BaseController {
  constructor(
    private readonly authService: AuthCommandService,
    private readonly googleService: GoogleAuthService,
    private readonly ipSalt: string,
    private readonly isProduction: boolean,
    private readonly cookieSecret: string,
  ) {
    super();
  }

  private setAuthCookies(res: Response, refreshToken: string): void {
    // Refresh token cookie (HttpOnly, Secure in prod, Lax, Path=/api/v1/auth)
    res.cookie(REFRESH_COOKIE_NAME, refreshToken, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
    });

    // Signed-in hint cookie (NOT HttpOnly so client / proxy can read it)
    res.cookie(SIGNED_IN_HINT_COOKIE, '1', {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
  }

  private clearAuthCookies(res: Response): void {
    res.clearCookie(REFRESH_COOKIE_NAME, {
      httpOnly: true,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/api/v1/auth',
    });
    res.clearCookie(SIGNED_IN_HINT_COOKIE, {
      httpOnly: false,
      secure: this.isProduction,
      sameSite: 'lax',
      path: '/',
    });
  }

  register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as RegisterInput;
      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const ipHash = hashIp(ip, this.ipSalt);
      const userAgent = req.headers['user-agent'];

      const result = await this.authService.register(input, { ipHash, userAgent });
      this.setAuthCookies(res, result.rawRefreshToken);

      this.created(res, result.tokens);
    } catch (err) {
      next(err);
    }
  };

  login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const input = req.body as LoginInput;

    try {
      const ipHash = hashIp(ip, this.ipSalt);
      const userAgent = req.headers['user-agent'];

      const result = await this.authService.login(input, { ipHash, userAgent });
      clearFailedLogin(ip, input.email);
      this.setAuthCookies(res, result.rawRefreshToken);

      this.ok(res, result.tokens);
    } catch (err) {
      recordFailedLogin(ip, input.email);
      next(err);
    }
  };

  refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
      if (!rawRefreshToken) {
        this.clearAuthCookies(res);
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Refresh token cookie missing',
            requestId: req.requestId,
          },
        });
        return;
      }

      const result = await this.authService.refresh(rawRefreshToken);
      this.setAuthCookies(res, result.newRefreshToken);

      this.ok(res, result.tokens);
    } catch (err) {
      this.clearAuthCookies(res);
      next(err);
    }
  };

  logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const rawRefreshToken = req.cookies[REFRESH_COOKIE_NAME];
      await this.authService.logout(rawRefreshToken);
      this.clearAuthCookies(res);
      this.noContent(res);
    } catch (err) {
      this.clearAuthCookies(res);
      next(err);
    }
  };

  logoutAll = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.noContent(res);
        return;
      }
      await this.authService.logoutAll(req.user._id.toString());
      this.clearAuthCookies(res);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  forgotPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ForgotPasswordInput;
      await this.authService.forgotPassword(input.email);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  resetPassword = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ResetPasswordInput;
      await this.authService.resetPassword(input);
      this.clearAuthCookies(res);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  verifyEmail = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as VerifyEmailInput;
      await this.authService.verifyEmail(input.token);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  resendVerification = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user) {
        this.noContent(res);
        return;
      }
      await this.authService.resendVerification(req.user._id.toString());
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  googleStart = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const redirect = (req.query.redirect as string) || '/pipeline';
      const { url, stateCookie } = this.googleService.generateAuthUrl(redirect, 'SIGN_IN');

      res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify(stateCookie), {
        httpOnly: true,
        secure: this.isProduction,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000, // 5 minutes
      });

      res.redirect(302, url);
    } catch (err) {
      next(err);
    }
  };

  googleLink = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.user || !req.sessionId) {
        res.status(401).json({
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication required to link Google account',
            requestId: req.requestId,
          },
        });
        return;
      }

      const { url, stateCookie } = this.googleService.generateAuthUrl(
        '/settings/security',
        'LINK',
        req.user._id.toString(),
        req.sessionId,
      );

      res.cookie(GOOGLE_STATE_COOKIE, JSON.stringify(stateCookie), {
        httpOnly: true,
        secure: this.isProduction,
        sameSite: 'lax',
        maxAge: 5 * 60 * 1000,
      });

      this.ok(res, { url });
    } catch (err) {
      next(err);
    }
  };

  googleCallback = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const code = req.query.code as string;
      const state = req.query.state as string;
      const rawCookie = req.cookies[GOOGLE_STATE_COOKIE];

      let stateCookie;
      if (rawCookie) {
        try {
          stateCookie = JSON.parse(rawCookie);
        } catch {
          stateCookie = undefined;
        }
      }

      res.clearCookie(GOOGLE_STATE_COOKIE);

      const ip = req.ip || req.socket.remoteAddress || 'unknown';
      const ipHash = hashIp(ip, this.ipSalt);
      const userAgent = req.headers['user-agent'];

      const result = await this.googleService.handleCallback(code, state, stateCookie, {
        ipHash,
        userAgent,
      });

      if (result.rawRefreshToken) {
        this.setAuthCookies(res, result.rawRefreshToken);
      }

      res.redirect(302, result.redirectUrl);
    } catch (err) {
      next(err);
    }
  };
}
