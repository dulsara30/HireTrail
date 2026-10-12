import { trusted } from 'mongoose';
import { LOOKUP_CACHE_DAYS } from '@hiretrail/shared';
import { AiLookupCacheModel, type AiLookupCacheDoc } from '../models/ai-lookup-cache.model';

/** Shared, non-user-owned cache keyed by normalised company name. Never stores hinted lookups. */
export class AiLookupCacheRepository {
  constructor(private readonly model = AiLookupCacheModel) {}

  public async findFresh(normalizedName: string): Promise<AiLookupCacheDoc | null> {
    const since = new Date(Date.now() - LOOKUP_CACHE_DAYS * 24 * 60 * 60 * 1000);
    return this.model.findOne({ normalizedName, createdAt: trusted({ $gte: since }) }).exec();
  }

  public async save(data: {
    normalizedName: string;
    result: Record<string, unknown>;
    sources: Array<{ url: string; title?: string }>;
    model: string;
  }): Promise<void> {
    const { model: modelId, ...rest } = data;
    await this.model
      .updateOne(
        { normalizedName: data.normalizedName },
        { $set: { ...rest, modelId, createdAt: new Date() } },
        { upsert: true },
      )
      .exec();
  }
}
