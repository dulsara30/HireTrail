import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import mongoose from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { ProviderHealthModel } from '../models/provider-health.model';
import { ExternalUsageModel } from '../models/external-usage.model';
import { ProviderHealthRepository } from '../repositories/provider-health.repository';
import { ExternalUsageRepository } from '../repositories/external-usage.repository';

describe('provider health and external usage stores', () => {
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
    await Promise.all([ProviderHealthModel.deleteMany({}), ExternalUsageModel.deleteMany({})]);
  });

  it('skips a provider during its cooldown and lists it in the snapshot', async () => {
    const health = new ProviderHealthRepository();
    expect(await health.isOpen('search:tavily')).toBe(false);

    await health.trip('search:tavily', 60_000, 'search quota');
    expect(await health.isOpen('search:tavily')).toBe(true);

    const snapshot = await new ProviderHealthRepository().snapshot();
    expect(snapshot).toHaveLength(1);
    expect(snapshot[0]?.key).toBe('search:tavily');
    expect(snapshot[0]?.reason).toBe('search quota');
  });

  it('shares the cooldown between instances and ignores one that has ended', async () => {
    await new ProviderHealthRepository().trip('gemini:a:text', 60_000, 'rate limit');
    expect(await new ProviderHealthRepository().isOpen('gemini:a:text')).toBe(true);

    // A cooldown that already ended must not block the provider (the TTL cleanup can lag)
    await ProviderHealthModel.create({
      key: 'gemini:b:text',
      openUntil: new Date(Date.now() - 1000),
      reason: 'old',
    });
    expect(await new ProviderHealthRepository().isOpen('gemini:b:text')).toBe(false);
    expect((await new ProviderHealthRepository().snapshot()).map((e) => e.key)).toEqual([
      'gemini:a:text',
    ]);
  });

  it('never spends more than the monthly budget, even for simultaneous requests', async () => {
    const usage = new ExternalUsageRepository();
    const results = await Promise.all(
      Array.from({ length: 8 }, () => usage.reserve('tavily', '2026-10', 1, 5)),
    );
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await usage.creditsUsed('tavily', '2026-10')).toBe(5);
    expect(await usage.reserve('tavily', '2026-10', 1, 5)).toBe(false);
  });

  it('counts each month on its own', async () => {
    const usage = new ExternalUsageRepository();
    expect(await usage.reserve('tavily', '2026-10', 1, 1)).toBe(true);
    expect(await usage.reserve('tavily', '2026-10', 1, 1)).toBe(false);
    expect(await usage.reserve('tavily', '2026-11', 1, 1)).toBe(true);
    expect(await usage.creditsUsed('tavily', '2026-12')).toBe(0);
  });
});
