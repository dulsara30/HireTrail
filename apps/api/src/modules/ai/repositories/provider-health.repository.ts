import { trusted } from 'mongoose';
import { type CooldownEntry, type ProviderHealth } from '../../../core/ports/provider-health.port';
import { ProviderHealthModel } from '../models/provider-health.model';

const CACHE_MS = 15_000;

/** Mongo-backed so every serverless instance shares what failed. Reads are cached for a few seconds. */
export class ProviderHealthRepository implements ProviderHealth {
  private readonly cache = new Map<string, { open: boolean; at: number }>();

  constructor(private readonly model = ProviderHealthModel) {}

  public async isOpen(key: string): Promise<boolean> {
    const hit = this.cache.get(key);
    if (hit && Date.now() - hit.at < CACHE_MS) return hit.open;
    const row = await this.model
      .findOne({ key, openUntil: trusted({ $gt: new Date() }) })
      .lean()
      .exec();
    const open = Boolean(row);
    this.cache.set(key, { open, at: Date.now() });
    return open;
  }

  public async trip(key: string, cooldownMs: number, reason: string): Promise<void> {
    await this.model
      .updateOne(
        { key },
        {
          $set: { openUntil: new Date(Date.now() + cooldownMs), reason: reason.slice(0, 200) },
          $inc: { trips: 1 },
        },
        { upsert: true },
      )
      .exec();
    this.cache.set(key, { open: true, at: Date.now() });
  }

  public async snapshot(): Promise<CooldownEntry[]> {
    const rows = await this.model
      .find({ openUntil: trusted({ $gt: new Date() }) })
      .sort({ key: 1 })
      .lean()
      .exec();
    return rows.map((r) => ({
      key: r.key,
      until: r.openUntil.toISOString(),
      reason: r.reason,
    }));
  }
}
