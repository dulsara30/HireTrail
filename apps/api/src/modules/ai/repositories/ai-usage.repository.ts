import { Types } from 'mongoose';
import { type AiFeature } from '@hiretrail/shared';
import { AiUsageModel, type AiUsageDoc, type AiUsageOutcome } from '../models/ai-usage.model';

export interface RecordUsageInput {
  userId: string;
  feature: AiFeature;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  outcome: AiUsageOutcome;
  day: string;
}

export class AiUsageRepository {
  constructor(private readonly model = AiUsageModel) {}

  public async record(input: RecordUsageInput): Promise<AiUsageDoc> {
    const { model: modelId, ...rest } = input;
    return this.model.create({ ...rest, modelId, userId: new Types.ObjectId(input.userId) });
  }

  /** Calls that count against a user's quota today (blocked calls do not cost anything). */
  public async countForUserFeature(
    userId: string,
    feature: AiFeature,
    day: string,
  ): Promise<number> {
    return this.model
      .countDocuments({ userId: new Types.ObjectId(userId), feature, day, outcome: 'OK' })
      .exec();
  }

  /** Intentionally not user-scoped: the global free-tier safety limit across all users. */
  public async countGlobalForDay(day: string): Promise<number> {
    return this.model.countDocuments({ day, outcome: 'OK' }).exec();
  }
}
