import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { app } from '../../../app';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { ApplicationModel } from '../../applications/models/application.model';
import { OptionModel } from '../../options/models/option.model';
import { OrbitTaskModel } from '../models/orbit-task.model';
import { OrbitSpaceModel } from '../models/orbit-space.model';
import { OrbitSettingsModel } from '../models/orbit-settings.model';

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number): string => new Date(Date.now() + n * DAY).toISOString();

describe('Orbit routes', () => {
  let replSet: MongoMemoryReplSet;

  const register = async (email: string, plan: 'FREE' | 'PRO' = 'FREE'): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', name: 'Test User' });
    if (plan === 'PRO') await UserModel.updateOne({ email }, { $set: { plan: 'PRO' } });
    return res.body.data.accessToken as string;
  };
  const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
  const post = (token: string, body: Record<string, unknown>) =>
    request(app).post('/api/v1/orbit/tasks').set(auth(token)).send(body);

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
      ApplicationModel.deleteMany({}),
      OptionModel.deleteMany({}),
      OrbitTaskModel.deleteMany({}),
      OrbitSpaceModel.deleteMany({}),
      OrbitSettingsModel.deleteMany({}),
    ]);
  });

  describe('tasks', () => {
    it('creates, reads, edits, completes, reopens and deletes an item', async () => {
      const token = await register('crud@hiretrail.local');
      const created = await post(token, {
        title: 'Prepare for Sysco',
        kind: 'INTERVIEW',
        priority: 'HIGH',
        dueAt: inDays(2),
        notesHtml: '<p>Ask about <b>team</b></p><script>alert(1)</script>',
      });
      expect(created.status).toBe(201);
      const task = created.body.data;
      expect(task.kind).toBe('INTERVIEW');
      expect(task.status).toBe('OPEN');
      expect(task.notesHtml).not.toContain('script');

      const read = await request(app).get(`/api/v1/orbit/tasks/${task.id}`).set(auth(token));
      expect(read.status).toBe(200);

      const edited = await request(app)
        .patch(`/api/v1/orbit/tasks/${task.id}`)
        .set(auth(token))
        .send({ title: 'Prepare for Sysco LABS', kind: 'CALL', version: task.version });
      expect(edited.status).toBe(200);
      expect(edited.body.data.title).toBe('Prepare for Sysco LABS');
      expect(edited.body.data.kind).toBe('CALL');

      const stale = await request(app)
        .patch(`/api/v1/orbit/tasks/${task.id}`)
        .set(auth(token))
        .send({ title: 'Stale', version: task.version });
      expect(stale.status).toBe(409);

      const done = await request(app)
        .post(`/api/v1/orbit/tasks/${task.id}/complete`)
        .set(auth(token))
        .send({ version: edited.body.data.version });
      expect(done.status).toBe(200);
      expect(done.body.data.task.status).toBe('DONE');
      expect(done.body.data.task.completedAt).not.toBeNull();

      const reopened = await request(app)
        .post(`/api/v1/orbit/tasks/${task.id}/reopen`)
        .set(auth(token))
        .send({ version: done.body.data.task.version });
      expect(reopened.body.data.status).toBe('OPEN');

      const removed = await request(app).delete(`/api/v1/orbit/tasks/${task.id}`).set(auth(token));
      expect(removed.status).toBe(204);
      const gone = await request(app).get(`/api/v1/orbit/tasks/${task.id}`).set(auth(token));
      expect(gone.status).toBe(404);
    });

    it("returns 404 for another user's item and never lists it", async () => {
      const owner = await register('owner@hiretrail.local');
      const other = await register('other@hiretrail.local');
      const created = await post(owner, { title: 'Private thing' });
      const id = created.body.data.id as string;

      expect((await request(app).get(`/api/v1/orbit/tasks/${id}`).set(auth(other))).status).toBe(
        404,
      );
      const patch = await request(app)
        .patch(`/api/v1/orbit/tasks/${id}`)
        .set(auth(other))
        .send({ title: 'Hacked', version: 0 });
      expect(patch.status).toBe(404);
      expect((await request(app).delete(`/api/v1/orbit/tasks/${id}`).set(auth(other))).status).toBe(
        404,
      );
      const list = await request(app).get('/api/v1/orbit/tasks').set(auth(other));
      expect(list.body.data).toHaveLength(0);
    });

    it('requires a sign-in and a title', async () => {
      expect((await request(app).get('/api/v1/orbit/tasks')).status).toBe(401);
      const token = await register('valid@hiretrail.local');
      expect((await post(token, { title: '   ' })).status).toBe(400);
      expect((await post(token, { title: 'x', kind: 'NOPE' })).status).toBe(400);
    });

    it('filters, searches and pages the list', async () => {
      const token = await register('list@hiretrail.local');
      await post(token, { title: 'Call Altrium', kind: 'CALL', dueAt: inDays(3), tags: ['hot'] });
      await post(token, { title: 'Email ASTA', kind: 'TASK', dueAt: inDays(1), priority: 'HIGH' });
      await post(token, { title: 'Undated idea', kind: 'OTHER' });
      const get = (q: string) => request(app).get(`/api/v1/orbit/tasks?${q}`).set(auth(token));

      const all = await get('');
      expect(all.body.data.map((t: { title: string }) => t.title)).toEqual([
        'Email ASTA',
        'Call Altrium',
        'Undated idea',
      ]);
      expect((await get('kind=CALL')).body.data).toHaveLength(1);
      expect((await get('kind=CALL,OTHER')).body.data).toHaveLength(2);
      expect((await get('q=asta')).body.data[0].title).toBe('Email ASTA');
      expect((await get('priority=HIGH')).body.data).toHaveLength(1);
      expect((await get('tag=hot')).body.data[0].title).toBe('Call Altrium');

      const first = await get('limit=2');
      expect(first.body.data).toHaveLength(2);
      expect(first.body.page.hasMore).toBe(true);
      const second = await get(`limit=2&cursor=${first.body.page.nextCursor}`);
      expect(second.body.data.map((t: { title: string }) => t.title)).toEqual(['Undated idea']);
      expect(second.body.page.hasMore).toBe(false);
    });

    it('snoozes an item and moves its reminder', async () => {
      const token = await register('snooze@hiretrail.local');
      const created = await post(token, { title: 'Nudge', kind: 'REMINDER', dueAt: inDays(0) });
      expect(created.body.data.remindAt).toBe(created.body.data.dueAt);

      const until = inDays(3);
      const snoozed = await request(app)
        .post(`/api/v1/orbit/tasks/${created.body.data.id}/snooze`)
        .set(auth(token))
        .send({ until, version: created.body.data.version });
      expect(snoozed.status).toBe(200);
      expect(new Date(snoozed.body.data.dueAt).getTime()).toBe(new Date(until).getTime());
      expect(new Date(snoozed.body.data.remindAt).getTime()).toBe(new Date(until).getTime());
    });

    it('checks that linked applications and companies belong to the user', async () => {
      const owner = await register('links-owner@hiretrail.local');
      const other = await register('links-other@hiretrail.local');
      const status = await OptionModel.findOne({
        userId: (await UserModel.findOne({ email: 'links-owner@hiretrail.local' }))!._id,
        type: 'STATUS',
      });
      const application = await request(app).post('/api/v1/applications').set(auth(owner)).send({
        companyName: 'Sysco LABS',
        roleTitle: 'Engineer',
        statusId: status!._id.toString(),
      });
      expect(application.status).toBe(201);
      const applicationId = application.body.data.application?.id ?? application.body.data.id;

      const linked = await post(owner, { title: 'Follow up', kind: 'FOLLOW_UP', applicationId });
      expect(linked.status).toBe(201);
      expect(linked.body.data.applicationLabel).toBe('Engineer at Sysco LABS');

      const stolen = await post(other, { title: 'Sneaky', applicationId });
      expect(stolen.status).toBe(404);
      const unknownCompany = await post(owner, {
        title: 'Nope',
        companyId: new mongoose.Types.ObjectId().toString(),
      });
      expect(unknownCompany.status).toBe(404);
    });
  });

  describe('plan limits', () => {
    it('stops a Free user at 15 open tasks and 5 open reminders, and lets Pro go past', async () => {
      const free = await register('free@hiretrail.local');
      for (let i = 0; i < 15; i++)
        expect((await post(free, { title: `Task ${i}` })).status).toBe(201);
      const over = await post(free, { title: 'One too many' });
      expect(over.status).toBe(403);
      expect(over.body.error.code).toBe('PLAN_LIMIT_REACHED');
      expect(over.body.error.details).toMatchObject({ limit: 15, plan: 'FREE' });

      // Reminders have their own count
      for (let i = 0; i < 5; i++) {
        expect((await post(free, { title: `Remind ${i}`, kind: 'REMINDER' })).status).toBe(201);
      }
      expect((await post(free, { title: 'Sixth', kind: 'REMINDER' })).body.error.code).toBe(
        'PLAN_LIMIT_REACHED',
      );

      // Finishing one makes room again
      const list = await request(app).get('/api/v1/orbit/tasks?limit=1').set(auth(free));
      const first = list.body.data[0];
      await request(app)
        .post(`/api/v1/orbit/tasks/${first.id}/complete`)
        .set(auth(free))
        .send({ version: first.version });
      expect((await post(free, { title: 'Room again' })).status).toBe(201);

      const pro = await register('pro@hiretrail.local', 'PRO');
      for (let i = 0; i < 18; i++)
        expect((await post(pro, { title: `Pro ${i}` })).status).toBe(201);
    });

    it('keeps Pro features behind Pro: watch, repeats, checklists and many tags', async () => {
      const free = await register('gated@hiretrail.local');
      const watch = await post(free, { title: 'Watch Altrium', kind: 'WATCH' });
      expect(watch.status).toBe(403);
      expect(watch.body.error.code).toBe('PLAN_REQUIRED');
      expect(
        (
          await post(free, {
            title: 'Weekly',
            recurrence: { freq: 'WEEKLY', interval: 1 },
            dueAt: inDays(1),
          })
        ).body.error.code,
      ).toBe('PLAN_REQUIRED');
      expect(
        (await post(free, { title: 'List', checklist: [{ id: 'a', text: 'step', done: false }] }))
          .body.error.code,
      ).toBe('PLAN_REQUIRED');
      expect((await post(free, { title: 'Tags', tags: ['a', 'b', 'c'] })).body.error.code).toBe(
        'PLAN_LIMIT_REACHED',
      );
      expect((await post(free, { title: 'Two tags', tags: ['a', 'b'] })).status).toBe(201);

      const pro = await register('pro-features@hiretrail.local', 'PRO');
      expect(
        (await post(pro, { title: 'Watch', kind: 'WATCH', watchUrl: 'https://altrium.io/careers' }))
          .status,
      ).toBe(201);
      expect(
        (
          await post(pro, {
            title: 'List',
            checklist: [{ id: 'a', text: 'step', done: false }],
            tags: ['a', 'b', 'c'],
          })
        ).status,
      ).toBe(201);
    });

    it('creates the next copy when a repeating Pro item is completed', async () => {
      const token = await register('repeat@hiretrail.local', 'PRO');
      const dueAt = inDays(-1);
      const created = await post(token, {
        title: 'Check Altrium careers',
        kind: 'WATCH',
        dueAt,
        recurrence: { freq: 'WEEKLY', interval: 2 },
      });
      expect(created.status).toBe(201);
      const done = await request(app)
        .post(`/api/v1/orbit/tasks/${created.body.data.id}/complete`)
        .set(auth(token))
        .send({ version: created.body.data.version });
      expect(done.status).toBe(200);
      expect(done.body.data.task.status).toBe('DONE');
      const next = done.body.data.next;
      expect(next.status).toBe('OPEN');
      expect(next.title).toBe('Check Altrium careers');
      expect(new Date(next.dueAt).getTime()).toBeGreaterThan(Date.now());
      expect(next.id).not.toBe(created.body.data.id);
    });
  });

  describe('timeline, due and pulse', () => {
    it('merges dated items with application deadlines and hides closed applications', async () => {
      const token = await register('timeline@hiretrail.local');
      const user = await UserModel.findOne({ email: 'timeline@hiretrail.local' });
      const status = await OptionModel.findOne({ userId: user!._id, type: 'STATUS' });
      const base = {
        userId: user!._id,
        companyName: 'ASTA',
        roleTitle: 'Engineer',
        statusId: status!._id,
        boardOrder: 'a0',
        lastActivityAt: new Date(),
      };
      await ApplicationModel.create({
        ...base,
        statusCategory: 'APPLIED',
        dates: { deadlineAt: new Date(inDays(2)), nextInterviewAt: new Date(inDays(4)) },
      });
      await ApplicationModel.create({
        ...base,
        companyName: 'Old Co',
        statusCategory: 'CLOSED',
        dates: { deadlineAt: new Date(inDays(2)) },
      });
      await post(token, { title: 'Prep notes', dueAt: inDays(1) });
      await post(token, { title: 'Far away', dueAt: inDays(60) });

      const res = await request(app)
        .get(
          `/api/v1/orbit/timeline?from=${encodeURIComponent(inDays(-1))}&to=${encodeURIComponent(inDays(10))}`,
        )
        .set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.tasks.map((t: { title: string }) => t.title)).toEqual(['Prep notes']);
      const events = res.body.data.applicationEvents as Array<{
        kind: string;
        companyName: string;
      }>;
      expect(events.map((e) => e.kind).sort()).toEqual(['DEADLINE', 'INTERVIEW']);
      expect(events.every((e) => e.companyName === 'ASTA')).toBe(true);

      const tooWide = await request(app)
        .get(
          `/api/v1/orbit/timeline?from=${encodeURIComponent(inDays(-500))}&to=${encodeURIComponent(inDays(10))}`,
        )
        .set(auth(token));
      expect(tooWide.status).toBe(400);
    });

    it('reports what is due now and how many are overdue', async () => {
      const token = await register('due@hiretrail.local');
      await post(token, { title: 'Late', dueAt: inDays(-2) });
      await post(token, {
        title: 'Reminder now',
        kind: 'REMINDER',
        dueAt: new Date(Date.now() - 60_000).toISOString(),
      });
      await post(token, { title: 'Later', dueAt: inDays(3) });
      const res = await request(app).get('/api/v1/orbit/due').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data.due.map((t: { title: string }) => t.title).sort()).toEqual([
        'Late',
        'Reminder now',
      ]);
      expect(res.body.data.overdueCount).toBe(2);
    });

    it('computes the weekly pulse', async () => {
      const token = await register('pulse@hiretrail.local');
      const user = await UserModel.findOne({ email: 'pulse@hiretrail.local' });
      const status = await OptionModel.findOne({ userId: user!._id, type: 'STATUS' });
      await ApplicationModel.create({
        userId: user!._id,
        companyName: 'Acentura',
        roleTitle: 'Dev',
        statusId: status!._id,
        statusCategory: 'APPLIED',
        boardOrder: 'a0',
        lastActivityAt: new Date(),
        milestones: { appliedAt: new Date() },
        dates: { appliedAt: new Date() },
      });
      const created = await post(token, { title: 'Finish me' });
      await request(app)
        .post(`/api/v1/orbit/tasks/${created.body.data.id}/complete`)
        .set(auth(token))
        .send({ version: created.body.data.version });
      await post(token, { title: 'Open one' });

      const res = await request(app).get('/api/v1/orbit/pulse?tzOffset=0').set(auth(token));
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({
        appliedThisWeek: 1,
        doneThisWeek: 1,
        openTotal: 1,
        overdue: 0,
        weeklyGoal: 5,
      });
      expect(res.body.data.streakDays).toBeGreaterThanOrEqual(1);
      expect(res.body.data.oldestWaitDays).toBe(0);
    });

    it('reports plan usage', async () => {
      const token = await register('plan@hiretrail.local');
      await post(token, { title: 'One' });
      await post(token, { title: 'Nudge', kind: 'REMINDER' });
      const res = await request(app).get('/api/v1/orbit/plan').set(auth(token));
      expect(res.body.data).toMatchObject({ plan: 'FREE', openTasks: 1, openReminders: 1 });
      expect(res.body.data.limits.tasks).toBe(15);
    });
  });

  describe('spaces and settings', () => {
    it('creates a default space on first read and keeps one space for Free', async () => {
      const token = await register('space@hiretrail.local');
      const first = await request(app).get('/api/v1/orbit/spaces').set(auth(token));
      expect(first.status).toBe(200);
      expect(first.body.data).toHaveLength(1);
      expect(first.body.data[0].name).toBe('Today');
      const types = first.body.data[0].widgets.map((w: { type: string }) => w.type);
      expect(types).toEqual(expect.arrayContaining(['ORBIT', 'TASKS', 'TODAY']));
      expect(
        (await request(app).get('/api/v1/orbit/spaces').set(auth(token))).body.data,
      ).toHaveLength(1);

      const second = await request(app)
        .post('/api/v1/orbit/spaces')
        .set(auth(token))
        .send({ name: 'Another' });
      expect(second.status).toBe(403);
      expect(second.body.error.code).toBe('PLAN_LIMIT_REACHED');

      const lastOne = await request(app)
        .delete(`/api/v1/orbit/spaces/${first.body.data[0].id}`)
        .set(auth(token));
      expect(lastOne.status).toBe(400);
    });

    it('lets Pro add spaces from templates and Free edit its layout within its widgets', async () => {
      const pro = await register('space-pro@hiretrail.local', 'PRO');
      const created = await request(app)
        .post('/api/v1/orbit/spaces')
        .set(auth(pro))
        .send({ name: 'Interviews', template: 'INTERVIEW_WEEK' });
      expect(created.status).toBe(201);
      expect(created.body.data.widgets.length).toBeGreaterThan(2);

      const free = await register('space-free@hiretrail.local');
      const spaces = await request(app).get('/api/v1/orbit/spaces').set(auth(free));
      const space = spaces.body.data[0];
      const moved = space.widgets.map((w: { x: number; y: number }, i: number) =>
        i === 0 ? { ...w, y: w.y + 1 } : w,
      );
      const saved = await request(app)
        .patch(`/api/v1/orbit/spaces/${space.id}`)
        .set(auth(free))
        .send({ widgets: moved, version: space.version });
      expect(saved.status).toBe(200);
      expect(saved.body.data.version).toBe(space.version + 1);

      // A Free user cannot add a Pro widget, but sees stale versions rejected
      const withPro = [
        ...saved.body.data.widgets,
        { id: 'calendar-1', type: 'CALENDAR', x: 0, y: 20, w: 5, h: 5, config: {} },
      ];
      const blocked = await request(app)
        .patch(`/api/v1/orbit/spaces/${space.id}`)
        .set(auth(free))
        .send({ widgets: withPro, version: saved.body.data.version });
      expect(blocked.status).toBe(403);
      expect(blocked.body.error.code).toBe('PLAN_REQUIRED');
      const stale = await request(app)
        .patch(`/api/v1/orbit/spaces/${space.id}`)
        .set(auth(free))
        .send({ name: 'Renamed', version: space.version });
      expect(stale.status).toBe(409);
    });

    it('rejects layouts that leave the grid or are too small', async () => {
      const token = await register('grid@hiretrail.local', 'PRO');
      const space = (await request(app).get('/api/v1/orbit/spaces').set(auth(token))).body.data[0];
      const save = (widgets: unknown[]) =>
        request(app)
          .patch(`/api/v1/orbit/spaces/${space.id}`)
          .set(auth(token))
          .send({ widgets, version: space.version });
      const off = await save([{ id: 'a', type: 'TASKS', x: 10, y: 0, w: 6, h: 4, config: {} }]);
      expect(off.status).toBe(400);
      const tiny = await save([{ id: 'a', type: 'ORBIT', x: 0, y: 0, w: 1, h: 1, config: {} }]);
      expect(tiny.status).toBe(400);
      const dup = await save([
        { id: 'a', type: 'TASKS', x: 0, y: 0, w: 4, h: 4, config: {} },
        { id: 'a', type: 'TODAY', x: 4, y: 0, w: 4, h: 4, config: {} },
      ]);
      expect(dup.status).toBe(400);
    });

    it('stores settings, validates the time zone and keeps email for Pro', async () => {
      const free = await register('settings-free@hiretrail.local');
      const defaults = await request(app).get('/api/v1/orbit/settings').set(auth(free));
      expect(defaults.body.data).toMatchObject({ weeklyGoal: 5, digestHour: 8 });

      const tz = await request(app)
        .put('/api/v1/orbit/settings')
        .set(auth(free))
        .send({ timezone: 'Asia/Colombo', weeklyGoal: 8 });
      expect(tz.body.data).toMatchObject({ timezone: 'Asia/Colombo', weeklyGoal: 8 });
      expect(
        (
          await request(app)
            .put('/api/v1/orbit/settings')
            .set(auth(free))
            .send({ timezone: 'Mars/Base' })
        ).status,
      ).toBe(400);
      const email = await request(app)
        .put('/api/v1/orbit/settings')
        .set(auth(free))
        .send({ emailDigest: true });
      expect(email.status).toBe(403);
      expect(email.body.error.code).toBe('PLAN_REQUIRED');
      expect(
        (
          await request(app)
            .put('/api/v1/orbit/settings')
            .set(auth(free))
            .send({ emailDigest: false })
        ).status,
      ).toBe(200);

      const pro = await register('settings-pro@hiretrail.local', 'PRO');
      const ok = await request(app)
        .put('/api/v1/orbit/settings')
        .set(auth(pro))
        .send({ emailDigest: true, emailReminders: true, digestHour: 7 });
      expect(ok.status).toBe(200);
      expect(ok.body.data.digestHour).toBe(7);
    });
  });

  describe('scheduled jobs', () => {
    it('are closed without a configured secret', async () => {
      const res = await request(app).get('/api/v1/internal/orbit/digest');
      expect(res.status).toBe(403);
      const withHeader = await request(app)
        .post('/api/v1/internal/orbit/due')
        .set('Authorization', 'Bearer anything');
      expect(withHeader.status).toBe(403);
    });
  });
});
