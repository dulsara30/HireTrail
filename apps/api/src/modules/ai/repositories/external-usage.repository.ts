import { trusted } from 'mongoose';
import { ExternalUsageModel } from '../models/external-usage.model';

export class ExternalUsageRepository {
  constructor(private readonly model = ExternalUsageModel) {}

  /** Takes `cost` credits for the month if the budget allows it. Atomic, so concurrent calls cannot overspend. */
  public async reserve(
    provider: string,
    month: string,
    cost: number,
    budget: number,
  ): Promise<boolean> {
    await this.model
      .updateOne({ provider, month }, { $setOnInsert: { credits: 0 } }, { upsert: true })
      .exec();
    const updated = await this.model
      .findOneAndUpdate(
        { provider, month, credits: trusted({ $lte: budget - cost }) },
        { $inc: { credits: cost } },
        { new: true },
      )
      .exec();
    return Boolean(updated);
  }

  public async creditsUsed(provider: string, month: string): Promise<number> {
    const row = await this.model.findOne({ provider, month }).lean().exec();
    return row?.credits ?? 0;
  }
}
