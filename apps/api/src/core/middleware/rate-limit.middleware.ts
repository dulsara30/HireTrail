import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import RateLimitMongo from 'rate-limit-mongo';
import mongoose from 'mongoose';
import { hashIp } from '../security/ip-hash';
import { RateLimitedError } from '../errors/domain-errors';

export function createMongoRateLimiter(options: {
  windowMs: number;
  max: number;
  keyGenerator?: (req: Request) => string;
  skipFailedRequests?: boolean;
}) {
  const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
  const connectionString = (mongoose.connection as unknown as { _connectionString?: string })
    ._connectionString;
  const store =
    !isTest && mongoose.connection.readyState === 1 && connectionString
      ? new RateLimitMongo({
          uri: connectionString,
          collectionName: 'rateLimits',
          expireTimeMs: options.windowMs,
          resetExpireDateOnChange: true,
        })
      : undefined;

  return rateLimit({
    windowMs: options.windowMs,
    max: options.max,
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    store,
    keyGenerator:
      options.keyGenerator ||
      ((req: Request) => {
        const ip = req.ip || req.socket.remoteAddress || 'unknown';
        return hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes');
      }),
    handler: (req: Request, res: Response, next: NextFunction, _limitOptions) => {
      const retryAfterSeconds = Math.ceil(options.windowMs / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      next(new RateLimitedError('Too many requests. Please try again later.'));
    },
  });
}

// Global API rate limit: 300 requests / 5 min per IP
export const globalApiRateLimit = createMongoRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 300,
});

// Auth endpoints limit: 10 / 15 min per IP + email
export const authEndpointRateLimit = createMongoRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    return `${hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes')}:${email}`;
  },
});

// Strict email endpoints limit (forgot password / resend email): 5 / hour
export const strictEmailRateLimit = createMongoRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req: Request) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const email = (req.body?.email || '').toLowerCase().trim();
    return `${hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes')}:${email}`;
  },
});

// Refresh endpoint rate limit: 60 / 15 min per IP
export const refreshRateLimit = createMongoRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
});

// Per-IP + email failed login lockout tracker (in-memory with fall-back)
interface FailedLoginRecord {
  count: number;
  firstFailedAt: number;
  lockedUntil?: number;
}
const failedLogins = new Map<string, FailedLoginRecord>();

export function checkLoginLockout(req: Request, res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || 'unknown';
  const email = (req.body?.email || '').toLowerCase().trim();
  const key = `${hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes')}:${email}`;

  const record = failedLogins.get(key);
  if (record && record.lockedUntil && Date.now() < record.lockedUntil) {
    const retryAfterSeconds = Math.ceil((record.lockedUntil - Date.now()) / 1000);
    res.setHeader('Retry-After', retryAfterSeconds);
    return next(
      new RateLimitedError(
        `Account login temporarily locked due to multiple failed attempts. Try again in ${retryAfterSeconds} seconds.`,
      ),
    );
  }

  next();
}

export function recordFailedLogin(ip: string, email: string): void {
  const key = `${hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes')}:${email.toLowerCase().trim()}`;
  const now = Date.now();
  const record = failedLogins.get(key) || { count: 0, firstFailedAt: now };

  // Reset count if window passed (15 mins)
  if (now - record.firstFailedAt > 15 * 60 * 1000) {
    record.count = 0;
    record.firstFailedAt = now;
    delete record.lockedUntil;
  }

  record.count += 1;
  if (record.count >= 5) {
    // Lock for 15 minutes
    record.lockedUntil = now + 15 * 60 * 1000;
  }

  failedLogins.set(key, record);
}

export function clearFailedLogin(ip: string, email: string): void {
  const key = `${hashIp(ip, process.env.IP_HASH_SALT || 'default-salt-16-bytes')}:${email.toLowerCase().trim()}`;
  failedLogins.delete(key);
}
