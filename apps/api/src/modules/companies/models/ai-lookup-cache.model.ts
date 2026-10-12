import { Schema, model, Document } from 'mongoose';
import { LOOKUP_CACHE_DAYS } from '@hiretrail/shared';

export interface AiLookupCacheDoc extends Document {
  normalizedName: string;
  result: Record<string, unknown>;
  sources: Array<{ url: string; title?: string }>;
  modelId: string;
  createdAt: Date;
}

const cacheSchema = new Schema<AiLookupCacheDoc>(
  {
    normalizedName: { type: String, required: true, unique: true },
    result: { type: Schema.Types.Mixed, required: true },
    sources: { type: [{ _id: false, url: String, title: String }], default: [] },
    modelId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

// TTL: shared lookups expire after 7 days
cacheSchema.index({ createdAt: 1 }, { expireAfterSeconds: LOOKUP_CACHE_DAYS * 24 * 60 * 60 });

export const AiLookupCacheModel = model<AiLookupCacheDoc>('AiLookupCache', cacheSchema);
