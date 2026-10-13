import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { CompanyModel } from '../models/company.model';
import { CompanyNoteModel } from '../models/company-note.model';
import { UserCompanyNotesModel } from '../models/user-company-notes.model';

describe('company notes, ratings and admin company panel', () => {
  let replSet: MongoMemoryReplSet;
  let companyId: string;

  const register = async (email: string): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', name: 'Test User' });
    return res.body.data.accessToken as string;
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
      CompanyNoteModel.deleteMany({}),
      UserCompanyNotesModel.deleteMany({}),
    ]);
    const company = await CompanyModel.create({
      ownerId: null,
      name: 'Acme Labs',
      normalizedName: 'acme labs',
      slug: 'acme-labs',
      source: { type: 'SEED' },
    });
    companyId = company._id.toString();
  });

  it('lets a user add, edit and delete several notes with different timestamps', async () => {
    const token = await register('notes@hiretrail.local');

    const first = await request(app)
      .post(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(token))
      .send({ bodyHtml: '<p>First impression</p>' });
    expect(first.status).toBe(201);
    const second = await request(app)
      .post(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(token))
      .send({ bodyHtml: '<p>After the interview</p><script>alert(1)</script>' });
    expect(second.status).toBe(201);
    expect(second.body.data.bodyHtml).not.toContain('script');

    const list = await request(app).get(`/api/v1/companies/${companyId}/my-notes`).set(auth(token));
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(2);
    expect(list.body.data[0].id).toBe(second.body.data.id);

    const edited = await request(app)
      .patch(`/api/v1/companies/${companyId}/my-notes/${first.body.data.id}`)
      .set(auth(token))
      .send({ bodyHtml: '<p>Changed my mind</p>', version: first.body.data.version });
    expect(edited.status).toBe(200);
    expect(edited.body.data.editedAt).not.toBeNull();

    const stale = await request(app)
      .patch(`/api/v1/companies/${companyId}/my-notes/${first.body.data.id}`)
      .set(auth(token))
      .send({ bodyHtml: '<p>Stale</p>', version: first.body.data.version });
    expect(stale.status).toBe(409);

    const del = await request(app)
      .delete(`/api/v1/companies/${companyId}/my-notes/${second.body.data.id}`)
      .set(auth(token));
    expect(del.status).toBe(204);
    const after = await request(app)
      .get(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(token));
    expect(after.body.data).toHaveLength(1);
  });

  it('returns 404 when touching a note that belongs to another user', async () => {
    const owner = await register('owner@hiretrail.local');
    const other = await register('other@hiretrail.local');
    const note = await request(app)
      .post(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(owner))
      .send({ bodyHtml: '<p>Private</p>' });

    const edit = await request(app)
      .patch(`/api/v1/companies/${companyId}/my-notes/${note.body.data.id}`)
      .set(auth(other))
      .send({ bodyHtml: '<p>Hacked</p>', version: 0 });
    expect(edit.status).toBe(404);
    const del = await request(app)
      .delete(`/api/v1/companies/${companyId}/my-notes/${note.body.data.id}`)
      .set(auth(other));
    expect(del.status).toBe(404);
    const theirs = await request(app)
      .get(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(other));
    expect(theirs.body.data).toHaveLength(0);
  });

  it('rejects empty notes, unknown companies and unauthenticated requests', async () => {
    const token = await register('empty@hiretrail.local');
    const empty = await request(app)
      .post(`/api/v1/companies/${companyId}/my-notes`)
      .set(auth(token))
      .send({ bodyHtml: '   ' });
    expect(empty.status).toBe(400);
    const missing = await request(app)
      .get(`/api/v1/companies/${new Types.ObjectId().toString()}/my-notes`)
      .set(auth(token));
    expect(missing.status).toBe(404);
    const anon = await request(app).get(`/api/v1/companies/${companyId}/my-notes`);
    expect(anon.status).toBe(401);
  });

  it('moves a legacy single note into the list exactly once', async () => {
    const token = await register('legacy@hiretrail.local');
    const user = await UserModel.findOne({ email: 'legacy@hiretrail.local' });
    await UserCompanyNotesModel.create({
      userId: user!._id,
      companyId: new Types.ObjectId(companyId),
      myRating: 3,
      notesHtml: '<p>Old note</p>',
    });

    const one = await request(app).get(`/api/v1/companies/${companyId}/my-notes`).set(auth(token));
    const two = await request(app).get(`/api/v1/companies/${companyId}/my-notes`).set(auth(token));
    expect(one.body.data).toHaveLength(1);
    expect(one.body.data[0].bodyHtml).toBe('<p>Old note</p>');
    expect(two.body.data).toHaveLength(1);
    const kept = await UserCompanyNotesModel.findOne({ userId: user!._id });
    expect(kept?.myRating).toBe(3);
  });

  it('sets and clears a rating, validating the range', async () => {
    const token = await register('rating@hiretrail.local');
    const ok = await request(app)
      .put(`/api/v1/companies/${companyId}/my-rating`)
      .set(auth(token))
      .send({ myRating: 4 });
    expect(ok.status).toBe(200);
    expect(ok.body.data.myRating).toBe(4);
    const bad = await request(app)
      .put(`/api/v1/companies/${companyId}/my-rating`)
      .set(auth(token))
      .send({ myRating: 9 });
    expect(bad.status).toBe(400);
    const cleared = await request(app)
      .put(`/api/v1/companies/${companyId}/my-rating`)
      .set(auth(token))
      .send({ myRating: null });
    expect(cleared.body.data.myRating).toBeNull();
  });

  describe('admin company panel', () => {
    const makeAdmin = async (email: string): Promise<string> => {
      const token = await register(email);
      await UserModel.updateOne({ email }, { $set: { role: 'ADMIN' } });
      return token;
    };

    it('shows the average rating without saying who rated, and blocks non-admins', async () => {
      const a = await register('a@hiretrail.local');
      const b = await register('b@hiretrail.local');
      await request(app)
        .put(`/api/v1/companies/${companyId}/my-rating`)
        .set(auth(a))
        .send({ myRating: 4 });
      await request(app)
        .put(`/api/v1/companies/${companyId}/my-rating`)
        .set(auth(b))
        .send({ myRating: 5 });
      await request(app)
        .post(`/api/v1/companies/${companyId}/my-notes`)
        .set(auth(a))
        .send({ bodyHtml: '<p>Private</p>' });
      const admin = await makeAdmin('admin@hiretrail.local');

      const res = await request(app).get(`/api/v1/admin/companies/${companyId}`).set(auth(admin));
      expect(res.status).toBe(200);
      expect(res.body.data.averageRating).toBe(4.5);
      expect(res.body.data.ratingCount).toBe(2);
      const text = JSON.stringify(res.body.data);
      expect(text).not.toContain('a@hiretrail.local');
      expect(text).not.toContain('Private');

      const denied = await request(app).get(`/api/v1/admin/companies/${companyId}`).set(auth(a));
      expect(denied.status).toBe(403);
      const deniedEdit = await request(app)
        .patch(`/api/v1/admin/companies/${companyId}`)
        .set(auth(a))
        .send({ name: 'Nope', version: 0, reason: 'trying it' });
      expect(deniedEdit.status).toBe(403);
    });

    it('returns a null average when nobody rated', async () => {
      const admin = await makeAdmin('admin2@hiretrail.local');
      const res = await request(app).get(`/api/v1/admin/companies/${companyId}`).set(auth(admin));
      expect(res.body.data.averageRating).toBeNull();
      expect(res.body.data.ratingCount).toBe(0);
    });

    it('edits a company, bumps the version and rejects a stale version or missing reason', async () => {
      const admin = await makeAdmin('admin3@hiretrail.local');
      const edit = await request(app)
        .patch(`/api/v1/admin/companies/${companyId}`)
        .set(auth(admin))
        .send({
          name: 'Acme Labs Ltd',
          website: 'https://acme.example',
          tier: 'A',
          techStack: ['Node.js', 'React'],
          version: 0,
          reason: 'Fix the legal name',
        });
      expect(edit.status).toBe(200);
      expect(edit.body.data.company.name).toBe('Acme Labs Ltd');
      expect(edit.body.data.version).toBe(1);

      const stale = await request(app)
        .patch(`/api/v1/admin/companies/${companyId}`)
        .set(auth(admin))
        .send({ name: 'Again', version: 0, reason: 'Stale edit attempt' });
      expect(stale.status).toBe(409);

      const noReason = await request(app)
        .patch(`/api/v1/admin/companies/${companyId}`)
        .set(auth(admin))
        .send({ name: 'No reason', version: 1 });
      expect(noReason.status).toBe(400);
    });
  });
});
