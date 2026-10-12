import { Types } from 'mongoose';
import { ImportModel, type ImportDoc } from '../models/import.model';

const TTL_MS = 60 * 60 * 1000;

export class ImportRepository {
  constructor(private readonly model = ImportModel) {}

  public async stage(
    userId: string,
    data: { fileName: string; headers: string[]; rows: Array<Record<string, string>> },
  ): Promise<ImportDoc> {
    return this.model.create({
      userId: new Types.ObjectId(userId),
      ...data,
      status: 'PREVIEWED',
      expiresAt: new Date(Date.now() + TTL_MS),
    });
  }

  public async findOwned(userId: string, id: string): Promise<ImportDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
  }

  /** Marks as committed only if still PREVIEWED, so a double click cannot import twice. */
  public async markCommitted(userId: string, id: string): Promise<boolean> {
    const res = await this.model
      .updateOne(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), status: 'PREVIEWED' },
        { $set: { status: 'COMMITTED' } },
      )
      .exec();
    return res.modifiedCount === 1;
  }
}
