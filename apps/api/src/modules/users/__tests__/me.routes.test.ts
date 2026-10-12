import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';

describe('/me Routes & Session Revocation Tests', () => {
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
  });

  it('GET /me returns user profile and AI quotas', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'me@hiretrail.local',
      password: 'Password123',
      name: 'Me User',
    });

    const token = regRes.body.data.accessToken;

    const res = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('me@hiretrail.local');
    expect(res.body.data.aiQuotaRemainingToday.autofill).toBeDefined();
  });

  it('PATCH /me/password changes password and revokes other sessions', async () => {
    const regRes = await request(app).post('/api/v1/auth/register').send({
      email: 'passchange@hiretrail.local',
      password: 'Password123',
      name: 'Pass User',
    });

    const token = regRes.body.data.accessToken;

    // Simulate second session for the same user
    const user = await UserModel.findOne({ email: 'passchange@hiretrail.local' });
    const session2 = await SessionModel.create({
      userId: user!._id,
      familyId: 'other-family',
      tokenHash: 'other-token-hash-64charslong1234567890abcdef1234567890abcdef12345678',
      expiresAt: new Date(Date.now() + 100000),
    });

    // Change password from first session
    const changeRes = await request(app)
      .patch('/api/v1/me/password')
      .set('Authorization', `Bearer ${token}`)
      .send({
        currentPassword: 'Password123',
        newPassword: 'NewPassword123',
      });

    expect(changeRes.status).toBe(204);

    // Verify other session was revoked
    const checkSession2 = await SessionModel.findById(session2._id);
    expect(checkSession2?.revokedAt).toBeDefined();
    expect(checkSession2?.revokedReason).toBe('PASSWORD_CHANGED');

    // First session remains active
    const meRes = await request(app).get('/api/v1/me').set('Authorization', `Bearer ${token}`);
    expect(meRes.status).toBe(200);
  });
});
