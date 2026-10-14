import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { type Mailer, type SendEmailOptions } from '../../../core/ports/mailer.port';
import { UserModel } from '../../auth/models/user.model';
import { UserRepository } from '../../auth/repositories/user.repository';
import { OrbitTaskModel } from '../models/orbit-task.model';
import { OrbitSettingsModel } from '../models/orbit-settings.model';
import { OrbitSettingsRepository } from '../repositories/orbit-settings.repository';
import { OrbitTaskRepository } from '../repositories/orbit-task.repository';
import { OrbitLinkResolver } from '../services/orbit-link-resolver';
import { OrbitNotificationService } from '../services/orbit-notification.service';
import { OrbitTaskQueryService } from '../services/orbit-task-query.service';

const HOUR = 60 * 60 * 1000;

describe('OrbitNotificationService', () => {
  let replSet: MongoMemoryReplSet;
  const sent: SendEmailOptions[] = [];
  const mailer: Mailer = { send: vi.fn(async (options) => void sent.push(options)) };

  const tasks = new OrbitTaskRepository();
  const settings = new OrbitSettingsRepository();
  const links = new OrbitLinkResolver();
  const service = new OrbitNotificationService(
    tasks,
    settings,
    new UserRepository(),
    links,
    new OrbitTaskQueryService(tasks, links, settings),
    mailer,
    'https://app.example',
  );

  const makeUser = async (
    email: string,
    over: { plan?: 'FREE' | 'PRO'; verified?: boolean; status?: 'ACTIVE' | 'SUSPENDED' } = {},
  ) => {
    const [user] = await UserModel.create([
      {
        email,
        name: 'Sam Lee',
        plan: over.plan ?? 'PRO',
        status: over.status ?? 'ACTIVE',
        emailVerifiedAt: over.verified === false ? null : new Date(),
        passwordHash: 'x',
      },
    ]);
    return user!;
  };

  const makeTask = (userId: Types.ObjectId, over: Record<string, unknown> = {}) =>
    OrbitTaskModel.create({
      userId,
      title: 'Check Altrium careers',
      kind: 'REMINDER',
      status: 'OPEN',
      dueAt: new Date(Date.now() - HOUR),
      sortAt: new Date(Date.now() - HOUR),
      remindAt: new Date(Date.now() - HOUR),
      ...over,
    });

  beforeAll(async () => {
    replSet = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
    await mongoose.connect(replSet.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await replSet.stop();
  });

  beforeEach(async () => {
    sent.length = 0;
    await Promise.all([
      UserModel.deleteMany({}),
      OrbitTaskModel.deleteMany({}),
      OrbitSettingsModel.deleteMany({}),
    ]);
  });

  describe('reminder emails', () => {
    it('emails a Pro user once for a reminder that is due, and never again', async () => {
      const user = await makeUser('pro@hiretrail.local');
      await makeTask(user._id);

      const first = await service.sendDueReminders();
      expect(first).toEqual({ emails: 1, items: 1 });
      expect(sent[0]?.to).toBe('pro@hiretrail.local');
      expect(sent[0]?.subject).toBe('Reminder: Check Altrium careers');
      expect(sent[0]?.html).toContain('https://app.example/orbit');

      const second = await service.sendDueReminders();
      expect(second).toEqual({ emails: 0, items: 0 });
      expect(sent).toHaveLength(1);
    });

    it('groups several due items for one user into one email', async () => {
      const user = await makeUser('group@hiretrail.local');
      await makeTask(user._id, { title: 'First' });
      await makeTask(user._id, { title: 'Second' });
      const result = await service.sendDueReminders();
      expect(result).toEqual({ emails: 1, items: 2 });
      expect(sent[0]?.subject).toBe('2 reminders are due');
    });

    it('skips Free users, unverified emails, suspended users and people who turned it off', async () => {
      const free = await makeUser('free@hiretrail.local', { plan: 'FREE' });
      const unverified = await makeUser('unverified@hiretrail.local', { verified: false });
      const suspended = await makeUser('suspended@hiretrail.local', { status: 'SUSPENDED' });
      const off = await makeUser('off@hiretrail.local');
      await settings.update(off._id.toString(), { emailReminders: false });
      for (const u of [free, unverified, suspended, off]) await makeTask(u._id);

      const result = await service.sendDueReminders();
      expect(result.emails).toBe(0);
      expect(sent).toHaveLength(0);
    });

    it('ignores reminders that are not due yet, are done, were deleted, or are very old', async () => {
      const user = await makeUser('later@hiretrail.local');
      await makeTask(user._id, { remindAt: new Date(Date.now() + HOUR) });
      await makeTask(user._id, { status: 'DONE' });
      await makeTask(user._id, { deletedAt: new Date() });
      await makeTask(user._id, { remindAt: new Date(Date.now() - 5 * 24 * HOUR) });
      expect(await service.sendDueReminders()).toEqual({ emails: 0, items: 0 });
    });

    it('keeps going when one email fails', async () => {
      const a = await makeUser('a@hiretrail.local');
      const b = await makeUser('b@hiretrail.local');
      await makeTask(a._id);
      await makeTask(b._id);
      (mailer.send as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Resend down'));
      const result = await service.sendDueReminders();
      expect(result.emails).toBe(1);
    });
  });

  describe('daily digest', () => {
    const noonUtc = new Date('2026-10-14T12:00:00Z');

    it('sends one digest per local day once the chosen hour has passed', async () => {
      const user = await makeUser('digest@hiretrail.local');
      await settings.update(user._id.toString(), {
        timezone: 'UTC',
        digestHour: 8,
        emailDigest: true,
      });
      await makeTask(user._id, {
        title: 'Late',
        dueAt: new Date('2026-10-13T09:00:00Z'),
        kind: 'TASK',
        remindAt: null,
      });
      await makeTask(user._id, {
        title: 'Soon',
        dueAt: new Date('2026-10-15T09:00:00Z'),
        kind: 'CALL',
        remindAt: null,
      });

      // before the chosen hour: nothing
      expect((await service.sendDigests(new Date('2026-10-14T06:00:00Z'))).emails).toBe(0);

      const first = await service.sendDigests(noonUtc);
      expect(first.emails).toBe(1);
      expect(sent[0]?.subject).toBe('Your day: 2 items, 1 overdue');
      expect(sent[0]?.text).toContain('OVERDUE');

      // the same day again: nothing; the next day: sent again
      expect((await service.sendDigests(new Date('2026-10-14T18:00:00Z'))).emails).toBe(0);
      await makeTask(user._id, {
        title: 'Next',
        dueAt: new Date('2026-10-16T09:00:00Z'),
        remindAt: null,
      });
      expect((await service.sendDigests(new Date('2026-10-15T12:00:00Z'))).emails).toBe(1);
    });

    it('uses the time zone of each user for the hour and the day', async () => {
      const user = await makeUser('tz@hiretrail.local');
      await settings.update(user._id.toString(), {
        timezone: 'Asia/Colombo',
        digestHour: 8,
        emailDigest: true,
      });
      await makeTask(user._id, {
        dueAt: new Date('2026-10-14T05:00:00Z'),
        remindAt: null,
        kind: 'TASK',
      });
      // 01:00 UTC is 06:30 in Colombo: too early
      expect((await service.sendDigests(new Date('2026-10-14T01:00:00Z'))).emails).toBe(0);
      // 03:00 UTC is 08:30 in Colombo
      expect((await service.sendDigests(new Date('2026-10-14T03:00:00Z'))).emails).toBe(1);
    });

    it('sends nothing when there is nothing coming up, and skips Free users', async () => {
      const empty = await makeUser('empty@hiretrail.local');
      await settings.update(empty._id.toString(), {
        timezone: 'UTC',
        digestHour: 0,
        emailDigest: true,
      });
      const free = await makeUser('freedigest@hiretrail.local', { plan: 'FREE' });
      await settings.update(free._id.toString(), {
        timezone: 'UTC',
        digestHour: 0,
        emailDigest: true,
      });
      await makeTask(free._id, {
        dueAt: new Date('2026-10-14T13:00:00Z'),
        remindAt: null,
        kind: 'TASK',
      });
      expect((await service.sendDigests(noonUtc)).emails).toBe(0);
      expect(sent).toHaveLength(0);
    });
  });
});
