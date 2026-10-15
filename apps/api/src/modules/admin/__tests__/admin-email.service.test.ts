import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import mongoose, { Types } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { type Mailer, type SendEmailOptions } from '../../../core/ports/mailer.port';
import { UserModel } from '../../auth/models/user.model';
import { UserRepository } from '../../auth/repositories/user.repository';
import { OrbitTaskModel } from '../../orbit/models/orbit-task.model';
import { OrbitSettingsModel } from '../../orbit/models/orbit-settings.model';
import { OrbitSettingsRepository } from '../../orbit/repositories/orbit-settings.repository';
import { OrbitTaskRepository } from '../../orbit/repositories/orbit-task.repository';
import { OrbitLinkResolver } from '../../orbit/services/orbit-link-resolver';
import { OrbitNotificationService } from '../../orbit/services/orbit-notification.service';
import { OrbitTaskQueryService } from '../../orbit/services/orbit-task-query.service';
import { AuditLogModel } from '../models/audit-log.model';
import { AuditLogRepository } from '../repositories/audit-log.repository';
import { AdminEmailService } from '../services/admin-email.service';

const HOUR = 60 * 60 * 1000;
const admin = { id: new Types.ObjectId().toString(), ipHash: null };

describe('AdminEmailService', () => {
  let replSet: MongoMemoryReplSet;
  const sent: SendEmailOptions[] = [];
  const mailer: Mailer = { send: vi.fn(async (options) => void sent.push(options)) };

  const tasks = new OrbitTaskRepository();
  const settings = new OrbitSettingsRepository();
  const links = new OrbitLinkResolver();
  const notifications = new OrbitNotificationService(
    tasks,
    settings,
    new UserRepository(),
    links,
    new OrbitTaskQueryService(tasks, links, settings),
    mailer,
    'https://app.example',
  );
  const service = new AdminEmailService(
    new UserRepository(),
    mailer,
    notifications,
    new AuditLogRepository(),
    'https://app.example',
    0,
  );

  const makeUser = async (
    email: string,
    over: { verified?: boolean; status?: 'ACTIVE' | 'SUSPENDED' } = {},
  ) => {
    const [user] = await UserModel.create([
      {
        email,
        name: 'Sam Lee',
        plan: 'FREE',
        status: over.status ?? 'ACTIVE',
        emailVerifiedAt: over.verified === false ? null : new Date(),
        passwordHash: 'x',
      },
    ]);
    return user!;
  };

  const general = (userIds: string[]) => ({
    template: 'GENERAL' as const,
    subject: 'Hello there',
    message: 'First paragraph.\n\nSecond <b>paragraph</b>.',
    userIds,
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
    vi.mocked(mailer.send).mockClear();
    await Promise.all([
      UserModel.deleteMany({}),
      OrbitTaskModel.deleteMany({}),
      OrbitSettingsModel.deleteMany({}),
      AuditLogModel.deleteMany({}),
    ]);
  });

  it('sends the chosen template to an active, verified user and escapes the message', async () => {
    const user = await makeUser('a@example.com');
    const result = await service.send(admin, general([user._id.toString()]));

    expect(result.sent).toBe(1);
    expect(result.results[0]).toMatchObject({ email: 'a@example.com', outcome: 'SENT' });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe('a@example.com');
    expect(sent[0]?.subject).toBe('Hello there');
    expect(sent[0]?.html).toContain('Hi Sam,');
    expect(sent[0]?.html).toContain('Second &lt;b&gt;paragraph&lt;/b&gt;.');
    expect(sent[0]?.html).not.toContain('<b>paragraph');
  });

  it('skips suspended users, unverified emails and unknown ids, with a reason', async () => {
    const suspended = await makeUser('s@example.com', { status: 'SUSPENDED' });
    const unverified = await makeUser('u@example.com', { verified: false });
    const unknown = new Types.ObjectId().toString();
    const result = await service.send(
      admin,
      general([suspended._id.toString(), unverified._id.toString(), unknown]),
    );

    expect(result.sent).toBe(0);
    expect(sent).toHaveLength(0);
    expect(result.results.map((r) => r.reason)).toEqual([
      'Account is suspended',
      'Email address is not verified',
      'User not found',
    ]);
  });

  it('sends each person once even when an id is repeated', async () => {
    const user = await makeUser('dup@example.com');
    const id = user._id.toString();
    const result = await service.send(admin, general([id, id]));
    expect(result.results).toHaveLength(1);
    expect(sent).toHaveLength(1);
  });

  it('reports a failed send without hiding the provider error text', async () => {
    const user = await makeUser('f@example.com');
    vi.mocked(mailer.send).mockRejectedValueOnce(new Error('re_secret_key invalid'));
    const result = await service.send(admin, general([user._id.toString()]));

    expect(result.sent).toBe(0);
    expect(result.results[0]?.outcome).toBe('FAILED');
    expect(JSON.stringify(result)).not.toContain('re_secret_key');
  });

  it('DUE_TASKS mails each person their own due items and skips people with none', async () => {
    const withTasks = await makeUser('due@example.com');
    const without = await makeUser('none@example.com');
    const other = await makeUser('other@example.com');
    const make = (userId: Types.ObjectId, title: string) =>
      OrbitTaskModel.create({
        userId,
        title,
        kind: 'TASK',
        status: 'OPEN',
        dueAt: new Date(Date.now() - HOUR),
        sortAt: new Date(Date.now() - HOUR),
      });
    await make(withTasks._id, 'Send portfolio');
    await make(other._id, 'Other persons secret task');

    const result = await service.send(admin, {
      template: 'DUE_TASKS',
      subject: 'Due tasks',
      userIds: [withTasks._id.toString(), without._id.toString()],
    });

    expect(result.sent).toBe(1);
    expect(result.results[1]).toMatchObject({ outcome: 'SKIPPED', reason: 'Nothing is due' });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.html).toContain('Send portfolio');
    expect(sent[0]?.html).not.toContain('Other persons secret task');
    expect(sent[0]?.html).toContain('https://app.example/orbit');
  });

  it('writes one audit entry per send with the counts but not the message', async () => {
    const user = await makeUser('audit@example.com');
    await service.send(admin, general([user._id.toString()]));

    const entries = await AuditLogModel.find({ action: 'ADMIN_EMAIL_SENT' });
    expect(entries).toHaveLength(1);
    expect(entries[0]?.after).toMatchObject({ template: 'GENERAL', recipients: 1, sent: 1 });
    expect(JSON.stringify(entries[0]?.after)).not.toContain('First paragraph');
  });

  it('previews a template with sample data and sends nothing', () => {
    const preview = service.preview({
      template: 'DUE_TASKS',
      subject: 'Due tasks',
      message: 'Quick nudge.',
    });
    expect(preview.subject).toBe('Due tasks');
    expect(preview.html).toContain('Send thank-you note');
    expect(preview.html).toContain('Quick nudge.');
    expect(sent).toHaveLength(0);
  });
});
