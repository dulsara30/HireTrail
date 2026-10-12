import { Types, type FilterQuery, trusted } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { ApplicationModel, type ApplicationDoc } from '../models/application.model';

export class ApplicationRepository extends BaseRepository<ApplicationDoc> {
  constructor() {
    super(ApplicationModel);
  }

  public async findLastInLane(userId: string, statusId: string): Promise<ApplicationDoc | null> {
    return this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        statusId: new Types.ObjectId(statusId),
        archivedAt: null,
        deletedAt: null,
      })
      .sort({ boardOrder: -1 })
      .exec();
  }

  public async countByStatus(
    userId: string,
    statusId: string,
    filter: FilterQuery<ApplicationDoc> = {},
  ): Promise<number> {
    return this.model.countDocuments({
      ...filter,
      userId: new Types.ObjectId(userId),
      statusId: new Types.ObjectId(statusId),
      archivedAt: null,
      deletedAt: null,
    });
  }

  public async findForUserInPastDays(userId: string, days = 90): Promise<ApplicationDoc[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        deletedAt: null,
        createdAt: trusted({ $gte: since }),
      })
      .exec();
  }

  public async listUserApplications(
    userId: string,
    filter: { companyId?: string } = {},
  ): Promise<ApplicationDoc[]> {
    const query: FilterQuery<ApplicationDoc> = {
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    };
    if (filter.companyId && Types.ObjectId.isValid(filter.companyId)) {
      query.companyId = new Types.ObjectId(filter.companyId);
    }
    return this.model.find(query).sort({ updatedAt: -1 }).exec();
  }
}
