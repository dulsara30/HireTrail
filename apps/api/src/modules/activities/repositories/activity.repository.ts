import { Types, ClientSession, FilterQuery } from 'mongoose';
import { ActivityModel, type ActivityDoc } from '../models/activity.model';
import { Cursor } from '../../../core/http/cursor';

export class ActivityRepository {
  constructor(private readonly model = ActivityModel) {}

  public async create(data: Partial<ActivityDoc>, session?: ClientSession): Promise<ActivityDoc> {
    const docs = await this.model.create([data], { session });
    return docs[0] as ActivityDoc;
  }

  public async listForEntity(
    userId: string,
    entityId: string,
    filterType?: 'history' | 'all',
    cursor?: string,
    limit = 20,
  ): Promise<{ items: ActivityDoc[]; nextCursor?: string; hasMore: boolean }> {
    const query: FilterQuery<ActivityDoc> = {
      userId: new Types.ObjectId(userId),
      entityId: new Types.ObjectId(entityId),
    };

    if (filterType === 'history') {
      query.type = { $nin: ['COMMENT_ADDED', 'COMMENT_EDITED', 'COMMENT_DELETED'] };
    }

    if (cursor) {
      const decoded = Cursor.decode<{ _id: string }>(cursor);
      if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
        query._id = { $lt: new Types.ObjectId(decoded._id) };
      }
    }

    const items = await this.model
      .find(query)
      .sort({ createdAt: -1, _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems[resultItems.length - 1];

    const nextCursor =
      hasMore && lastItem ? Cursor.encode({ _id: lastItem._id.toString() }) : undefined;

    return { items: resultItems, nextCursor, hasMore };
  }
}
