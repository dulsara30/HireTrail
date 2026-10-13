import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { CompanyModel } from '../../companies/models/company.model';
import { AuditLogModel } from '../models/audit-log.model';

describe('POST /admin/companies (add a company to the directory)', () => {
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
      CompanyModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
    ]);
  });

  it('creates a global company from reviewed lookup data and writes an audit entry', async () => {
    const admin = await makeAdmin('create-admin@hiretrail.local');
    const res = await request(app)
      .post('/api/v1/admin/companies')
      .set(auth(admin))
      .send({
        name: 'Acentura Inc',
        website: 'https://acentura.example',
        country: 'Sri Lanka',
        description: 'Software services.',
        linkedinUrl: 'https://www.linkedin.com/company/acentura',
        contactEmail: 'info@acentura.example',
        foundedYear: '2012',
        techStack: ['React', 'Node.js'],
        fromAiLookup: true,
        sourceUrls: ['https://acentura.example/about'],
        reason: 'Looked up with public sources',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.company.name).toBe('Acentura Inc');
    expect(res.body.data.company.isGlobal).toBe(true);
    expect(res.body.data.company.source.type).toBe('AI_LOOKUP');

    const stored = await CompanyModel.findOne({ name: 'Acentura Inc' });
    expect(stored?.ownerId).toBeNull();
    expect(stored?.linkedinUrl).toBe('https://www.linkedin.com/company/acentura');
    expect(stored?.contactEmail).toBe('info@acentura.example');
    expect(stored?.foundedYear).toBe('2012');
    expect(stored?.techStack).toEqual(['React', 'Node.js']);
    expect(res.body.data.company.linkedinUrl).toBe('https://www.linkedin.com/company/acentura');
    const audit = await AuditLogModel.findOne({ action: 'COMPANY_CREATED' });
    expect(audit?.reason).toBe('Looked up with public sources');
  });

  it('rejects a duplicate name with the existing company id', async () => {
    const admin = await makeAdmin('dup-admin@hiretrail.local');
    const body = { name: 'Acentura Inc', reason: 'First entry in directory' };
    const first = await request(app).post('/api/v1/admin/companies').set(auth(admin)).send(body);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post('/api/v1/admin/companies')
      .set(auth(admin))
      .send({ ...body, name: '  ACENTURA inc ' });
    expect(second.status).toBe(409);
  });

  it('requires a reason and a name', async () => {
    const admin = await makeAdmin('valid-admin@hiretrail.local');
    const noReason = await request(app)
      .post('/api/v1/admin/companies')
      .set(auth(admin))
      .send({ name: 'No Reason Ltd' });
    expect(noReason.status).toBe(400);
    const noName = await request(app)
      .post('/api/v1/admin/companies')
      .set(auth(admin))
      .send({ reason: 'Missing the name' });
    expect(noName.status).toBe(400);
  });

  it('is admin only, for creating and for the lookup', async () => {
    const user = await register('plain-user@hiretrail.local');
    const create = await request(app)
      .post('/api/v1/admin/companies')
      .set(auth(user))
      .send({ name: 'Nope Ltd', reason: 'Trying as a user' });
    expect(create.status).toBe(403);
    const lookup = await request(app)
      .post('/api/v1/admin/companies/lookup')
      .set(auth(user))
      .send({ name: 'Nope Ltd' });
    expect(lookup.status).toBe(403);
    const anon = await request(app).post('/api/v1/admin/companies').send({ name: 'x' });
    expect(anon.status).toBe(401);
  });
});
