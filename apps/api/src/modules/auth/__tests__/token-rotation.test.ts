import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AuthCommandService } from '../services/auth-command.service';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OneTimeTokenRepository } from '../repositories/one-time-token.repository';
import { OptionSeedService } from '../services/option-seed.service';
import { Argon2PasswordHasher } from '../../../infrastructure/hashing/argon2.password-hasher';
import { JwtTokenSigner } from '../../../infrastructure/tokens/jwt.token-signer';
import { ConsoleMailer } from '../../../infrastructure/mailer/console.mailer';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';
import { OptionModel } from '../../options/models/option.model';

describe('Refresh Token Rotation & Reuse Detection Unit Tests', () => {
  let replSet: MongoMemoryReplSet;
  let authService: AuthCommandService;
  let sessionRepo: SessionRepository;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    const userRepo = new UserRepository();
    sessionRepo = new SessionRepository();
    const tokenRepo = new OneTimeTokenRepository();
    const optionSeedService = new OptionSeedService();
    const hasher = new Argon2PasswordHasher();
    const signer = new JwtTokenSigner(
      'secret-key-that-is-at-least-32-chars-long!',
      'hiretrail-api',
      'hiretrail-web',
      15,
    );
    const mailer = new ConsoleMailer();

    authService = new AuthCommandService(
      userRepo,
      sessionRepo,
      tokenRepo,
      optionSeedService,
      hasher,
      signer,
      mailer,
      'http://localhost:3000',
      30,
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await SessionModel.deleteMany({});
    await OptionModel.deleteMany({});
  });

  it('allows concurrent refresh within 10s grace window without forking session family', async () => {
    const reg = await authService.register(
      { email: 'grace@hiretrail.local', password: 'Password123', name: 'Grace' },
      {},
    );

    const token1 = reg.rawRefreshToken;

    // First refresh: rotates token1 -> token2
    const ref1 = await authService.refresh(token1);
    const token2 = ref1.newRefreshToken;
    expect(token2).not.toBe(token1);

    // Concurrent second refresh immediately with token1 (simulating second browser tab in flight)
    // Within 10s window: must succeed without revoking family
    const ref2 = await authService.refresh(token1);
    expect(ref2.tokens.accessToken).toBeDefined();

    // Verify session family is still active
    const session = await SessionModel.findOne({ tokenHash: { $exists: true } });
    expect(session?.revokedAt).toBeNull();
  });

  it('revokes entire family with REUSE_DETECTED when rotated token is used after 10s grace window', async () => {
    const reg = await authService.register(
      { email: 'reuse@hiretrail.local', password: 'Password123', name: 'Reuse' },
      {},
    );

    const token1 = reg.rawRefreshToken;

    // First refresh: rotates token1 -> token2
    const ref1 = await authService.refresh(token1);
    expect(ref1.newRefreshToken).not.toBe(token1);

    // Fast-forward rotatedAt date beyond 10s grace window (e.g. 15s ago)
    await SessionModel.updateMany({}, { $set: { rotatedAt: new Date(Date.now() - 15000) } });

    // Now present token1 again -> must trigger reuse detection and revoke family
    await expect(authService.refresh(token1)).rejects.toThrow(/Token reuse detected/);

    // Verify family was revoked
    const session = await SessionModel.findOne({});
    expect(session?.revokedAt).toBeDefined();
    expect(session?.revokedReason).toBe('REUSE_DETECTED');
  });
});
