import { Schema, model, Document, Types } from 'mongoose';
import { AiFeature } from '@hiretrail/shared';

export type AiUsageOutcome = 'OK' | 'BLOCKED' | 'ERROR';

export interface AiUsageDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  feature: AiFeature;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  outcome: AiUsageOutcome;
  day: string;
  createdAt: Date;
}

const aiUsageSchema = new Schema<AiUsageDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    feature: { type: String, enum: Object.values(AiFeature), required: true },
    modelId: { type: String, default: '' },
    inputTokens: { type: Number, default: 0 },
    outputTokens: { type: Number, default: 0 },
    latencyMs: { type: Number, default: 0 },
    outcome: { type: String, enum: ['OK', 'BLOCKED', 'ERROR'], required: true },
    day: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

aiUsageSchema.index({ userId: 1, feature: 1, day: 1 });
aiUsageSchema.index({ day: 1 });
// TTL: usage rows are kept for 180 days
aiUsageSchema.index({ createdAt: 1 }, { expireAfterSeconds: 180 * 24 * 60 * 60 });

export const AiUsageModel = model<AiUsageDoc>('AiUsage', aiUsageSchema);
