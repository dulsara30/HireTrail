import { Types } from 'mongoose';
import { AiInsightsModel, type AiInsightsDoc } from '../models/ai-insights.model';

export class AiInsightsRepository {
  constructor(private readonly model = AiInsightsModel) {}

  public async findForWeek(userId: string, isoWeek: string): Promise<AiInsightsDoc | null> {
    return this.model.findOne({ userId: new Types.ObjectId(userId), isoWeek }).exec();
  }

  public async findLatest(userId: string): Promise<AiInsightsDoc | null> {
    return this.model
      .findOne({ userId: new Types.ObjectId(userId) })
      .sort({ refreshedAt: -1 })
      .exec();
  }

  public async upsert(
    userId: string,
    isoWeek: string,
    data: { insights: AiInsightsDoc['insights']; modelId: string },
  ): Promise<AiInsightsDoc> {
    const now = new Date();
    const doc = await this.model
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), isoWeek },
        { $set: { ...data, refreshedAt: now }, $setOnInsert: { createdAt: now } },
        { upsert: true, new: true },
      )
      .exec();
    return doc as AiInsightsDoc;
  }
}
