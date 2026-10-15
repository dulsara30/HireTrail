import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { AuditLogModel } from '../models/audit-log.model';

describe('admin email routes', () => {
  let replSet: MongoMemoryReplSet;

  const register = async (email: string): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', name: 'Test User' });
    return res.body.data.accessToken as string;
  };
  const makeAdmin = async (email: string): Promise<string> => {
    const token = await register(email);
    await UserModel.updateOne({ email }, { $set: { role: 'ADMIN' } });
    return token;
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const valid = {
    template: 'FEATURE_ANNOUNCEMENT',
    subject: 'New in HireTrail',
    message: 'Orbit is here.',
  };

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    await Promise.all([
      UserModel.deleteMany({}),
      SessionModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
    ]);
  });

  it('previews a template for an admin', async () => {
    const admin = await makeAdmin('preview-admin@hiretrail.local');
    const res = await request(app)
      .post('/api/v1/admin/emails/preview')
      .set(auth(admin))
      .send(valid);
    expect(res.status).toBe(200);
    expect(res.body.data.subject).toBe('New in HireTrail');
    expect(res.body.data.html).toContain('Orbit is here.');
  });

  it('sends to the chosen user and writes an audit entry', async () => {
    const admin = await makeAdmin('send-admin@hiretrail.local');
    const target = await UserModel.findOne({ email: 'send-admin@hiretrail.local' });
    await UserModel.updateOne({ _id: target!._id }, { $set: { emailVerifiedAt: new Date() } });

    const res = await request(app)
      .post('/api/v1/admin/emails/send')
      .set(auth(admin))
      .send({ ...valid, userIds: [target!._id.toString()] });
    expect(res.status).toBe(200);
    expect(res.body.data.sent).toBe(1);
    expect(await AuditLogModel.countDocuments({ action: 'ADMIN_EMAIL_SENT' })).toBe(1);
  });

  it('validates the body', async () => {
    const admin = await makeAdmin('invalid-admin@hiretrail.local');
    const post = (body: object) =>
      request(app).post('/api/v1/admin/emails/send').set(auth(admin)).send(body);

    expect((await post({ ...valid, userIds: [] })).status).toBe(400);
    expect((await post({ ...valid, userIds: ['nope'] })).status).toBe(400);
    expect((await post({ ...valid, subject: '', userIds: ['a'.repeat(24)] })).status).toBe(400);
    expect((await post({ ...valid, message: '', userIds: ['a'.repeat(24)] })).status).toBe(400);
    expect(
      (await post({ ...valid, ctaUrl: 'javascript:alert(1)', userIds: ['a'.repeat(24)] })).status,
    ).toBe(400);
    expect((await post({ ...valid, template: 'SPAM', userIds: ['a'.repeat(24)] })).status).toBe(
      400,
    );
  });

  it('does not require a message for the due tasks template', async () => {
    const admin = await makeAdmin('due-admin@hiretrail.local');
    const res = await request(app)
      .post('/api/v1/admin/emails/preview')
      .set(auth(admin))
      .send({ template: 'DUE_TASKS', subject: 'Due tasks' });
    expect(res.status).toBe(200);
  });

  it('is admin only', async () => {
    const user = await register('plain@hiretrail.local');
    const send = await request(app)
      .post('/api/v1/admin/emails/send')
      .set(auth(user))
      .send({ ...valid, userIds: ['a'.repeat(24)] });
    expect(send.status).toBe(403);
    const preview = await request(app)
      .post('/api/v1/admin/emails/preview')
      .set(auth(user))
      .send(valid);
    expect(preview.status).toBe(403);
    const anon = await request(app).post('/api/v1/admin/emails/send').send(valid);
    expect(anon.status).toBe(401);
  });
});
