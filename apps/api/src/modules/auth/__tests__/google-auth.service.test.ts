import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { GoogleAuthService } from '../services/google-auth.service';
import { UserRepository } from '../repositories/user.repository';
import { SessionRepository } from '../repositories/session.repository';
import { OptionSeedService } from '../services/option-seed.service';
import { JwtTokenSigner } from '../../../infrastructure/tokens/jwt.token-signer';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';

describe('Google Auth Security Tests', () => {
  let replSet: MongoMemoryReplSet;
  let googleService: GoogleAuthService;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());

    const userRepo = new UserRepository();
    const sessionRepo = new SessionRepository();
    const optionSeedService = new OptionSeedService();
    const signer = new JwtTokenSigner(
      'secret-key-that-is-at-least-32-chars-long!',
      'hiretrail-api',
      'hiretrail-web',
      15,
    );

    googleService = new GoogleAuthService(
      'test-client-id.apps.googleusercontent.com',
      'test-client-secret',
      'http://localhost:3000/api/v1/auth/google/callback',
      userRepo,
      sessionRepo,
      optionSeedService,
      signer,
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
  });

  it('sanitizes malicious open redirect URLs and falls back safely to default', () => {
    const malicious = googleService.generateAuthUrl('https://malicious-site.com/phish');
    // Relative redirect guard must sanitize to /pipeline
    expect(malicious.stateCookie.redirect).toBe('/pipeline');

    const protocolRelative = googleService.generateAuthUrl('//attacker.com');
    expect(protocolRelative.stateCookie.redirect).toBe('/pipeline');

    const valid = googleService.generateAuthUrl('/applications?filter=active');
    expect(valid.stateCookie.redirect).toBe('/applications?filter=active');
  });

  it('rejects callback when state parameter does not match state cookie', async () => {
    await expect(
      googleService.handleCallback(
        'valid-code',
        'wrong-state',
        {
          state: 'correct-state',
          codeVerifier: 'verifier',
          redirect: '/pipeline',
        },
        {},
      ),
    ).rejects.toThrow(/Invalid OAuth state parameter/);
  });
});
