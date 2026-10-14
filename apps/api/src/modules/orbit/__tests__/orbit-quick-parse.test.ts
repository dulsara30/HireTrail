import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { AiFeature } from '@hiretrail/shared';
import { app } from '../../../app';
import { type AiProvider } from '../../../core/ports/ai-provider.port';
import { UserModel } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { UsageAccumulator, type AiQuotaService } from '../../ai/services/ai-quota.service';
import { localToUtc, normalizeQuickParse } from '../services/orbit-quick-parse';
import { OrbitQuickParseService } from '../services/orbit-quick-parse.service';

const NOW = new Date('2026-10-14T05:00:00Z'); // 10:30 in Colombo (UTC+5:30)
const input = (text: string, tzOffset = 330) => ({ text, now: NOW, tzOffset });

describe('localToUtc', () => {
  it('turns the user local time into a UTC moment using their offset', () => {
    expect(localToUtc('2026-10-15T15:00', 330)?.at.toISOString()).toBe('2026-10-15T09:30:00.000Z');
    expect(localToUtc('2026-10-15', 330)).toMatchObject({ allDay: true });
    expect(localToUtc('2026-10-15T15:00', 330)?.allDay).toBe(false);
  });

  it('rejects things that are not real dates', () => {
    expect(localToUtc('2026-02-31', 0)).toBeNull();
    expect(localToUtc('tomorrow', 0)).toBeNull();
    expect(localToUtc('2026-13-01', 0)).toBeNull();
  });
});

describe('normalizeQuickParse', () => {
  it('keeps valid values and converts the date to UTC', () => {
    const result = normalizeQuickParse(
      {
        title: ' Call Sysco ',
        kind: 'CALL',
        dueLocal: '2026-10-15T15:00',
        priority: 'HIGH',
        tags: ['#prep', 'prep', 'cv'],
        company: 'Sysco LABS',
      },
      input('Call Sysco tomorrow 3pm #prep #cv'),
    );
    expect(result).toMatchObject({
      title: 'Call Sysco',
      kind: 'CALL',
      dueAt: '2026-10-15T09:30:00.000Z',
      allDay: false,
      priority: 'HIGH',
      tags: ['prep', 'cv'],
      company: 'Sysco LABS',
      recurrence: null,
      watchUrl: null,
    });
  });

  it('drops unknown kinds, bad priorities, impossible dates and dates far away', () => {
    const result = normalizeQuickParse(
      { title: 'x', kind: 'PARTY', priority: 'URGENT', dueLocal: '2026-02-31' },
      input('x'),
    );
    expect(result.kind).toBe('TASK');
    expect(result.priority).toBeNull();
    expect(result.dueAt).toBeNull();
    expect(
      normalizeQuickParse({ title: 'x', dueLocal: '2020-01-01' }, input('x')).dueAt,
    ).toBeNull();
    expect(
      normalizeQuickParse({ title: 'x', dueLocal: '2040-01-01' }, input('x')).dueAt,
    ).toBeNull();
  });

  it('falls back to the typed text when the title is missing', () => {
    expect(normalizeQuickParse({ kind: 'TASK' }, input('  Update my CV  ')).title).toBe(
      'Update my CV',
    );
  });

  it('accepts a repeat only with a known frequency and clamps the interval', () => {
    expect(
      normalizeQuickParse({ title: 'x', recurrence: { freq: 'WEEKLY', interval: 2 } }, input('x'))
        .recurrence,
    ).toEqual({ freq: 'WEEKLY', interval: 2 });
    expect(
      normalizeQuickParse({ title: 'x', recurrence: { freq: 'MONTHLY', interval: 99 } }, input('x'))
        .recurrence,
    ).toEqual({ freq: 'MONTHLY', interval: 12 });
    expect(
      normalizeQuickParse({ title: 'x', recurrence: { freq: 'YEARLY', interval: 1 } }, input('x'))
        .recurrence,
    ).toBeNull();
    expect(
      normalizeQuickParse({ title: 'x', recurrence: 'weekly' }, input('x')).recurrence,
    ).toBeNull();
  });

  it('keeps a link only when the note really contains it (no invented links)', () => {
    const text = 'Check https://altrium.io/careers every 2 weeks';
    expect(
      normalizeQuickParse({ title: 'x', watchUrl: 'https://altrium.io/careers' }, input(text))
        .watchUrl,
    ).toBe('https://altrium.io/careers');
    expect(
      normalizeQuickParse({ title: 'x', watchUrl: 'https://made-up.example/jobs' }, input(text))
        .watchUrl,
    ).toBeNull();
    expect(
      normalizeQuickParse(
        { title: 'x', watchUrl: 'javascript:alert(1)' },
        input('javascript:alert(1)'),
      ).watchUrl,
    ).toBeNull();
  });
});

describe('OrbitQuickParseService', () => {
  const quota = {
    track: vi.fn(
      async (_u: string, _f: unknown, work: (u: UsageAccumulator) => Promise<unknown>) => ({
        result: await work(new UsageAccumulator()),
        usageId: 'x',
      }),
    ),
  } as unknown as AiQuotaService;

  it('sends only the note and the time, on the cheap model, and cleans the answer', async () => {
    const generateJson = vi.fn(async () => ({
      data: {
        title: 'Check Altrium careers',
        kind: 'WATCH',
        dueLocal: '2026-10-28',
        company: 'Altrium',
      },
      groundingSources: [],
      usage: { inputTokens: 120, outputTokens: 40 },
      modelId: 'cheap-model',
    }));
    const service = new OrbitQuickParseService({ generateJson } as unknown as AiProvider, quota);

    const result = await service.parse(
      'user1',
      { text: 'company watch Altrium in 2 weeks', tzOffset: 330 },
      NOW,
    );

    expect(result).toMatchObject({
      kind: 'WATCH',
      company: 'Altrium',
      allDay: true,
      dueAt: '2026-10-27T18:30:00.000Z',
    });
    const call = generateJson.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(call[0].model).toBe('extract');
    expect(call[0].tools).toBeUndefined();
    const sent = JSON.parse(String(call[0].content));
    expect(Object.keys(sent).sort()).toEqual(['note', 'nowLocal', 'utcOffsetMinutes']);
    expect(sent.nowLocal).toBe('2026-10-14T10:30');
    expect(quota.track).toHaveBeenCalledWith('user1', AiFeature.ORBIT_PARSE, expect.any(Function));
  });
});

describe('POST /orbit/quick-parse guards', () => {
  let replSet: MongoMemoryReplSet;
  const register = async (email: string, plan: 'FREE' | 'PRO' = 'FREE'): Promise<string> => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email, password: 'Password123', name: 'Test User' });
    await UserModel.updateOne({ email }, { $set: { plan, emailVerifiedAt: new Date() } });
    return res.body.data.accessToken as string;
  };
  const post = (token: string | null, body: Record<string, unknown>) => {
    const req = request(app).post('/api/v1/orbit/quick-parse');
    return (token ? req.set({ Authorization: `Bearer ${token}` }) : req).send(body);
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
    await Promise.all([UserModel.deleteMany({}), SessionModel.deleteMany({})]);
  });

  it('is closed to Free users and to people who are not signed in', async () => {
    const free = await register('qp-free@hiretrail.local');
    const denied = await post(free, { text: 'Call Sysco tomorrow' });
    expect(denied.status).toBe(403);
    expect(denied.body.error.code).toBe('PLAN_REQUIRED');
    expect((await post(null, { text: 'Call Sysco tomorrow' })).status).toBe(401);
  });

  it('checks the input for Pro users, and fails clearly when AI is not set up', async () => {
    const pro = await register('qp-pro@hiretrail.local', 'PRO');
    expect((await post(pro, { text: ' ' })).status).toBe(400);
    expect((await post(pro, { text: 'x'.repeat(400) })).status).toBe(400);
    const unavailable = await post(pro, { text: 'Call Sysco tomorrow 3pm' });
    expect(unavailable.status).toBe(502);
  });
});
