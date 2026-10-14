import { Types, trusted } from 'mongoose';
import { OrbitSettingsModel, type OrbitSettingsDoc } from '../models/orbit-settings.model';

export class OrbitSettingsRepository {
  constructor(private readonly model = OrbitSettingsModel) {}

  /** The user's settings, created with defaults on first use. */
  public async getOrCreate(userId: string): Promise<OrbitSettingsDoc> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $setOnInsert: { userId: new Types.ObjectId(userId) } },
        { upsert: true, new: true },
      )
      .exec();
    return doc as OrbitSettingsDoc;
  }

  public async update(
    userId: string,
    changes: Partial<OrbitSettingsDoc>,
  ): Promise<OrbitSettingsDoc> {
    const doc = await this.model
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId) },
        { $set: changes },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();
    return doc as OrbitSettingsDoc;
  }

  /** Users who want the daily digest and have not got today's yet. */
  public async digestCandidates(cap: number): Promise<OrbitSettingsDoc[]> {
    return this.model.find({ emailDigest: true }).limit(cap).exec();
  }

  /** Sets the digest date only if it differs, so two runs cannot both send it. */
  public async claimDigestDate(userId: string, localDate: string): Promise<boolean> {
    const result = await this.model
      .updateOne(
        { userId: new Types.ObjectId(userId), lastDigestDate: trusted({ $ne: localDate }) },
        { $set: { lastDigestDate: localDate } },
      )
      .exec();
    return result.modifiedCount > 0;
  }
}
