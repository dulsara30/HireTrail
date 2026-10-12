import {
  type Model,
  type FilterQuery,
  type UpdateQuery,
  type Document,
  Types,
  trusted,
} from 'mongoose';
import { type PageInfo, type CursorPaginationQuery, DEFAULT_PAGE_SIZE } from '@hiretrail/shared';
import { ConflictError, NotFoundError } from '../errors/domain-errors';
import { Cursor } from '../http/cursor';

export interface VersionedDocument extends Document {
  version?: number;
  userId?: Types.ObjectId | string;
  deletedAt?: Date | null;
}

export abstract class BaseRepository<TDoc extends VersionedDocument> {
  protected constructor(protected readonly model: Model<TDoc>) {}

  public async findOwnedById(userId: string, id: string): Promise<TDoc | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        userId: new Types.ObjectId(userId),
      } as FilterQuery<TDoc>)
      .exec();
  }

  public async listOwned(
    userId: string,
    filter: FilterQuery<TDoc> = {},
    pagination: CursorPaginationQuery = { limit: DEFAULT_PAGE_SIZE },
  ): Promise<{ items: TDoc[]; page: PageInfo }> {
    const limit = pagination.limit ?? DEFAULT_PAGE_SIZE;
    const query: FilterQuery<TDoc> = {
      ...filter,
      userId: new Types.ObjectId(userId),
    };

    if (pagination.cursor) {
      const decoded = Cursor.decode<{ _id: string }>(pagination.cursor);
      if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
        query._id = trusted({
          $lt: new Types.ObjectId(decoded._id),
        }) as unknown as FilterQuery<TDoc>['_id'];
      }
    }

    // Fetch limit + 1 to determine if more items exist
    const items = await this.model
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems[resultItems.length - 1];

    const nextCursor =
      hasMore && lastItem ? Cursor.encode({ _id: lastItem._id.toString() }) : undefined;

    return {
      items: resultItems,
      page: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  }

  public async updateOwnedWithVersion(
    userId: string,
    id: string,
    version: number,
    changes: UpdateQuery<TDoc>,
  ): Promise<TDoc> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError();
    }

    const objectId = new Types.ObjectId(id);
    const userObjectId = new Types.ObjectId(userId);

    const updated = await this.model
      .findOneAndUpdate(
        {
          _id: objectId,
          userId: userObjectId,
          version,
        } as FilterQuery<TDoc>,
        {
          ...changes,
          $inc: { version: 1 },
        },
        { new: true },
      )
      .exec();

    if (updated) {
      return updated;
    }

    // Check if document exists for user
    const existing = await this.model
      .findOne({ _id: objectId, userId: userObjectId } as FilterQuery<TDoc>)
      .exec();

    if (!existing) {
      throw new NotFoundError();
    }

    throw new ConflictError(
      'Resource version conflict. The record has been modified by another request.',
      { currentVersion: existing.version },
    );
  }

  public async softDeleteOwned(userId: string, id: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError();
    }

    const objectId = new Types.ObjectId(id);
    const userObjectId = new Types.ObjectId(userId);

    const result = await this.model
      .updateOne({ _id: objectId, userId: userObjectId, deletedAt: null } as FilterQuery<TDoc>, {
        $set: { deletedAt: new Date() },
      })
      .exec();

    if (result.matchedCount === 0) {
      throw new NotFoundError();
    }

    return true;
  }

  public async restoreOwned(userId: string, id: string): Promise<TDoc> {
    if (!Types.ObjectId.isValid(id)) {
      throw new NotFoundError();
    }

    const objectId = new Types.ObjectId(id);
    const userObjectId = new Types.ObjectId(userId);

    const restored = await this.model
      .findOneAndUpdate(
        { _id: objectId, userId: userObjectId } as FilterQuery<TDoc>,
        { $set: { deletedAt: null } },
        { new: true },
      )
      .setOptions({ withDeleted: true })
      .exec();

    if (!restored) {
      throw new NotFoundError();
    }

    return restored;
  }
}
