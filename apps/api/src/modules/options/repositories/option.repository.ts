import { Types, type FilterQuery, type ClientSession } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { OptionModel, type OptionDoc } from '../models/option.model';
import { OptionType } from '@hiretrail/shared';

export class OptionRepository extends BaseRepository<OptionDoc> {
  constructor() {
    super(OptionModel);
  }

  public async findByType(
    userId: string,
    type: OptionType,
    includeArchived = false,
  ): Promise<OptionDoc[]> {
    const query: FilterQuery<OptionDoc> = {
      userId: new Types.ObjectId(userId),
      type,
    };
    if (!includeArchived) {
      query.archivedAt = null;
    }
    return this.model.find(query).sort({ order: 1 }).exec();
  }

  public async findAllForUser(userId: string, includeArchived = false): Promise<OptionDoc[]> {
    const query: FilterQuery<OptionDoc> = {
      userId: new Types.ObjectId(userId),
    };
    if (!includeArchived) {
      query.archivedAt = null;
    }
    return this.model.find(query).sort({ type: 1, order: 1 }).exec();
  }

  public async findByKey(userId: string, type: OptionType, key: string): Promise<OptionDoc | null> {
    return this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        type,
        key,
      })
      .exec();
  }

  public async findLastInType(userId: string, type: OptionType): Promise<OptionDoc | null> {
    return this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        type,
      })
      .sort({ order: -1 })
      .exec();
  }

  public async createOption(data: Partial<OptionDoc>, session?: ClientSession): Promise<OptionDoc> {
    const docs = await this.model.create([data], { session });
    return docs[0] as OptionDoc;
  }

  public async countInUse(userId: string, optionId: string): Promise<number> {
    // Check applications referencing this option across all option fields
    const db = this.model.db;
    const appCollection = db.collection('applications');
    const objectId = new Types.ObjectId(optionId);
    const userObjectId = new Types.ObjectId(userId);

    const count = await appCollection.countDocuments({
      userId: userObjectId,
      deletedAt: null,
      $or: [
        { statusId: objectId },
        { priorityId: objectId },
        { workModeId: objectId },
        { jobTypeId: objectId },
        { levelId: objectId },
        { sourceId: objectId },
        { cvVersionId: objectId },
        { labelIds: objectId },
      ],
    });

    return count;
  }
}
