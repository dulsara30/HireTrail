import { Types } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { OrbitSpaceModel, type OrbitSpaceDoc } from '../models/orbit-space.model';

export class OrbitSpaceRepository extends BaseRepository<OrbitSpaceDoc> {
  constructor() {
    super(OrbitSpaceModel);
  }

  public async listForUser(userId: string): Promise<OrbitSpaceDoc[]> {
    return this.model
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ order: 1, _id: 1 })
      .exec();
  }

  public async countForUser(userId: string): Promise<number> {
    return this.model.countDocuments({ userId: new Types.ObjectId(userId) }).exec();
  }

  public async createSpace(data: Partial<OrbitSpaceDoc>): Promise<OrbitSpaceDoc> {
    const docs = await this.model.create([data]);
    return docs[0] as OrbitSpaceDoc;
  }

  public async deleteOwned(userId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) return false;
    const result = await this.model
      .deleteOne({ _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId) })
      .exec();
    return result.deletedCount > 0;
  }
}
