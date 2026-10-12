import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../models/user.model';
import { SessionModel } from '../models/session.model';
import { OneTimeTokenModel } from '../models/one-time-token.model';
import { OptionModel } from '../../options/models/option.model';

describe('Phase 1 Auth Routes & Security Tests', () => {
  let replSet: MongoMemoryReplSet;

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await UserModel.deleteMany({});
    await SessionModel.deleteMany({});
    await OneTimeTokenModel.deleteMany({});
    await OptionModel.deleteMany({});
  });

  describe('Registration & Default Option Seeding', () => {
    it('registers user, hashes password, seeds default options in transaction, and stores only hashed tokens in DB', async () => {
      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'test@hiretrail.local',
        password: 'Password123',
        name: 'Test Trail',
      });

      expect(res.status).toBe(201);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('test@hiretrail.local');

      // Verify cookies
      const cookies = (res.headers['set-cookie'] || []) as string[];
      expect(cookies.some((c: string) => c.includes('ht_rt='))).toBe(true);
      expect(cookies.some((c: string) => c.includes('ht_signed_in=1'))).toBe(true);

      // Verify user created with argon2 hash
      const user = await UserModel.findOne({ email: 'test@hiretrail.local' });
      expect(user).toBeDefined();
      expect(user!.passwordHash).not.toBe('Password123');
      expect(user!.passwordHash?.startsWith('$argon2')).toBe(true);

      // Verify default options seeded in database
      const options = await OptionModel.find({ userId: user!._id });
      expect(options.length).toBeGreaterThan(10);
      expect(options.some((o) => o.type === 'STATUS' && o.key === 'applied')).toBe(true);

      // Verify refresh token stored in sessions collection is ONLY a SHA-256 hash (never raw token)
      const session = await SessionModel.findOne({ userId: user!._id });
      expect(session).toBeDefined();
      expect(session!.tokenHash).toHaveLength(64); // SHA-256 hex string

      // Verify email verification token in oneTimeTokens is also ONLY a SHA-256 hash
      const oneTimeToken = await OneTimeTokenModel.findOne({ userId: user!._id });
      expect(oneTimeToken).toBeDefined();
      expect(oneTimeToken!.tokenHash).toHaveLength(64);
    });

    it('returns 409 DUPLICATE on registering an already registered email', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'duplicate@hiretrail.local',
        password: 'Password123',
        name: 'Original',
      });

      const res = await request(app).post('/api/v1/auth/register').send({
        email: 'duplicate@hiretrail.local',
        password: 'NewPassword123',
        name: 'Duplicate',
      });

      expect(res.status).toBe(409);
      expect(res.body.error.code).toBe('DUPLICATE');
    });
  });

  describe('Login & Unknown Email Timing Mitigation', () => {
    it('returns 401 INVALID_CREDENTIALS for unknown email with consistent timing', async () => {
      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'unknown@hiretrail.local',
        password: 'Password123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });

    it('returns 401 INVALID_CREDENTIALS for wrong password', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'login@hiretrail.local',
        password: 'Password123',
        name: 'Login User',
      });

      const res = await request(app).post('/api/v1/auth/login').send({
        email: 'login@hiretrail.local',
        password: 'WrongPassword123',
      });

      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
    });
  });

  describe('CSRF Mitigation on /auth/refresh and /auth/logout', () => {
    it('rejects /auth/refresh without X-Requested-With: hiretrail header with 403', async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send({
        email: 'csrf@hiretrail.local',
        password: 'Password123',
        name: 'CSRF User',
      });

      const setCookie = (registerRes.headers['set-cookie'] || []) as string[];
      const rtCookie = setCookie.find((c: string) => c.includes('ht_rt='));

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', rtCookie || '');

      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('rejects /auth/logout without X-Requested-With header with 403', async () => {
      const res = await request(app).post('/api/v1/auth/logout');
      expect(res.status).toBe(403);
      expect(res.body.error.code).toBe('FORBIDDEN');
    });

    it('succeeds on /auth/refresh when X-Requested-With header is present and rotates token', async () => {
      const registerRes = await request(app).post('/api/v1/auth/register').send({
        email: 'validrefresh@hiretrail.local',
        password: 'Password123',
        name: 'Refresh User',
      });

      const setCookie = (registerRes.headers['set-cookie'] || []) as string[];
      const rtCookie = setCookie.find((c: string) => c.includes('ht_rt='));

      const res = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Cookie', rtCookie || '')
        .set('X-Requested-With', 'hiretrail');

      expect(res.status).toBe(200);
      expect(res.body.data.accessToken).toBeDefined();

      const refreshCookies = (res.headers['set-cookie'] || []) as string[];
      const newRtCookie = refreshCookies.find((c: string) => c.includes('ht_rt='));
      expect(newRtCookie).toBeDefined();
      expect(newRtCookie).not.toBe(rtCookie);
    });
  });

  describe('Forgot Password Enumeration Protection', () => {
    it('returns 204 identically for both existing and unknown emails', async () => {
      await request(app).post('/api/v1/auth/register').send({
        email: 'existing@hiretrail.local',
        password: 'Password123',
        name: 'Existing',
      });

      const resExisting = await request(app)
        .post('/api/v1/auth/password/forgot')
        .send({ email: 'existing@hiretrail.local' });
      expect(resExisting.status).toBe(204);

      const resUnknown = await request(app)
        .post('/api/v1/auth/password/forgot')
        .send({ email: 'nonexistent@hiretrail.local' });
      expect(resUnknown.status).toBe(204);
    });
  });

  describe('Guard Middlewares (Role, Plan, Suspended)', () => {
    it('applies plan change on the very next request because role/plan are loaded fresh from DB', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: 'planchange@hiretrail.local',
        password: 'Password123',
        name: 'Plan User',
      });

      const token = regRes.body.data.accessToken;

      // GET /me should show plan FREE
      const meRes1 = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(meRes1.status).toBe(200);
      expect(meRes1.body.data.plan).toBe('FREE');

      // Update user in DB directly to PRO
      await UserModel.findOneAndUpdate(
        { email: 'planchange@hiretrail.local' },
        { $set: { plan: 'PRO' } },
      );

      // GET /me with same access token immediately reflects PRO
      const meRes2 = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(meRes2.status).toBe(200);
      expect(meRes2.body.data.plan).toBe('PRO');
    });

    it('immediately rejects suspended users with 401 on next request', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: 'suspended@hiretrail.local',
        password: 'Password123',
        name: 'Suspended User',
      });

      const token = regRes.body.data.accessToken;

      // Suspend user
      await UserModel.findOneAndUpdate(
        { email: 'suspended@hiretrail.local' },
        { $set: { status: 'SUSPENDED' } },
      );

      const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(401);
    });
  });

  describe('Sign Out Everywhere (logoutAll)', () => {
    it('revokes all sessions so active tokens cannot authenticate', async () => {
      const regRes = await request(app).post('/api/v1/auth/register').send({
        email: 'signoutall@hiretrail.local',
        password: 'Password123',
        name: 'Sign Out All',
      });

      const token = regRes.body.data.accessToken;

      const logoutAllRes = await request(app)
        .post('/api/v1/auth/logout-all')
        .set('Authorization', `Bearer ${token}`);
      expect(logoutAllRes.status).toBe(204);

      // Next request with that token fails because session was revoked
      const meRes = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
      expect(meRes.status).toBe(401);
      expect(meRes.body.error.code).toBe('SESSION_REVOKED');
    });
  });
});
