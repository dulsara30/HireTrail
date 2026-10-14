import { Types, trusted, type FilterQuery } from 'mongoose';
import { type ListOrbitTasksQuery } from '@hiretrail/shared';
import { BaseRepository } from '../../../core/base/base.repository';
import { Cursor } from '../../../core/http/cursor';
import { OrbitTaskModel, type OrbitTaskDoc } from '../models/orbit-task.model';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export interface TaskPage {
  items: OrbitTaskDoc[];
  nextCursor?: string;
  hasMore: boolean;
}

export class OrbitTaskRepository extends BaseRepository<OrbitTaskDoc> {
  constructor() {
    super(OrbitTaskModel);
  }

  public async createTask(data: Partial<OrbitTaskDoc>): Promise<OrbitTaskDoc> {
    const docs = await this.model.create([data]);
    return docs[0] as OrbitTaskDoc;
  }

  public async findManyOwned(userId: string, ids: string[]): Promise<OrbitTaskDoc[]> {
    const valid = ids.filter((id) => Types.ObjectId.isValid(id));
    if (valid.length === 0) return [];
    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        _id: trusted({ $in: valid.map((id) => new Types.ObjectId(id)) }),
        deletedAt: null,
      })
      .exec();
  }

  public async countOpen(
    userId: string,
    kinds: { in?: string[]; notIn?: string[] },
  ): Promise<number> {
    const kindFilter: Record<string, unknown> = {};
    if (kinds.in) kindFilter.$in = kinds.in;
    if (kinds.notIn) kindFilter.$nin = kinds.notIn;
    return this.model
      .countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'OPEN',
        deletedAt: null,
        kind: trusted(kindFilter),
      })
      .exec();
  }

  /** Filtered, paginated list. Sorted by due date (undated last) or by creation, newest first. */
  public async list(userId: string, query: ListOrbitTasksQuery): Promise<TaskPage> {
    const limit = query.limit ?? 25;
    const filter: FilterQuery<OrbitTaskDoc> = {
      userId: new Types.ObjectId(userId),
      deletedAt: null,
    };
    if (query.status && query.status !== 'ALL') filter.status = query.status;
    if (query.kind && query.kind.length > 0) filter.kind = trusted({ $in: query.kind });
    if (query.priority) filter.priority = query.priority;
    if (query.applicationId && Types.ObjectId.isValid(query.applicationId)) {
      filter.applicationId = new Types.ObjectId(query.applicationId);
    }
    if (query.companyId && Types.ObjectId.isValid(query.companyId)) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }
    if (query.tag) filter.tags = query.tag;
    if (query.q) filter.title = new RegExp(escapeRegex(query.q), 'i');
    if (query.from || query.to) {
      const range: Record<string, Date> = {};
      if (query.from) range.$gte = query.from;
      if (query.to) range.$lte = query.to;
      filter.dueAt = trusted(range);
    }

    const byDue = query.sort !== 'created';
    const cursor = query.cursor ? Cursor.decode<{ s?: string; id?: string }>(query.cursor) : null;
    if (cursor?.id && Types.ObjectId.isValid(cursor.id)) {
      const id = new Types.ObjectId(cursor.id);
      if (byDue && cursor.s) {
        const at = new Date(cursor.s);
        filter.$or = [{ sortAt: trusted({ $gt: at }) }, { sortAt: at, _id: trusted({ $gt: id }) }];
      } else if (!byDue) {
        filter._id = trusted({ $lt: id });
      }
    }

    const rows = await this.model
      .find(filter)
      .sort(byDue ? { sortAt: 1, _id: 1 } : { _id: -1 })
      .limit(limit + 1)
      .exec();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      hasMore,
      nextCursor:
        hasMore && last
          ? Cursor.encode({ s: last.sortAt.toISOString(), id: last._id.toString() })
          : undefined,
    };
  }

  /** Items with a date inside the window, for the radar, the calendar and Today. */
  public async inWindow(
    userId: string,
    from: Date,
    to: Date,
    cap: number,
  ): Promise<OrbitTaskDoc[]> {
    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        deletedAt: null,
        dueAt: trusted({ $gte: from, $lte: to }),
      })
      .sort({ dueAt: 1, _id: 1 })
      .limit(cap)
      .exec();
  }

  /** Open items whose reminder or due time has passed. */
  public async dueNow(userId: string, now: Date, limit: number): Promise<OrbitTaskDoc[]> {
    return this.model
      .find(this.dueFilter(userId, now))
      .sort({ sortAt: 1, _id: 1 })
      .limit(limit)
      .exec();
  }

  public async countOverdue(userId: string, now: Date): Promise<number> {
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return this.model
      .countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'OPEN',
        deletedAt: null,
        $or: [
          { allDay: false, dueAt: trusted({ $lt: now, $ne: null }) },
          { allDay: true, dueAt: trusted({ $lt: dayAgo, $ne: null }) },
        ],
      })
      .exec();
  }

  public async countOpenAll(userId: string): Promise<number> {
    return this.model
      .countDocuments({ userId: new Types.ObjectId(userId), status: 'OPEN', deletedAt: null })
      .exec();
  }

  public async countDueBetween(userId: string, from: Date, to: Date): Promise<number> {
    return this.model
      .countDocuments({
        userId: new Types.ObjectId(userId),
        status: 'OPEN',
        deletedAt: null,
        dueAt: trusted({ $gte: from, $lt: to }),
      })
      .exec();
  }

  public async completedBetween(userId: string, from: Date, to: Date): Promise<Date[]> {
    const rows = await this.model
      .find({
        userId: new Types.ObjectId(userId),
        deletedAt: null,
        completedAt: trusted({ $gte: from, $lt: to }),
      })
      .select('completedAt')
      .lean()
      .exec();
    return rows.map((r) => r.completedAt as Date);
  }

  /** Items whose reminder should be emailed now and has not been yet. Ignores very old ones. */
  public async reminderBacklog(
    now: Date,
    maxAgeHours: number,
    cap: number,
  ): Promise<OrbitTaskDoc[]> {
    const oldest = new Date(now.getTime() - maxAgeHours * 60 * 60 * 1000);
    return this.model
      .find({
        status: 'OPEN',
        deletedAt: null,
        notifiedAt: null,
        remindAt: trusted({ $lte: now, $gte: oldest }),
      })
      .sort({ remindAt: 1 })
      .limit(cap)
      .exec();
  }

  public async claimNotified(ids: Types.ObjectId[], now: Date): Promise<number> {
    const result = await this.model
      .updateMany({ _id: trusted({ $in: ids }), notifiedAt: null }, { $set: { notifiedAt: now } })
      .exec();
    return result.modifiedCount;
  }

  /** Open items on or before a date, for the daily digest. */
  public async openUpTo(userId: string, until: Date, cap: number): Promise<OrbitTaskDoc[]> {
    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        status: 'OPEN',
        deletedAt: null,
        dueAt: trusted({ $lt: until, $ne: null }),
      })
      .sort({ dueAt: 1 })
      .limit(cap)
      .exec();
  }

  private dueFilter(userId: string, now: Date): FilterQuery<OrbitTaskDoc> {
    return {
      userId: new Types.ObjectId(userId),
      status: 'OPEN',
      deletedAt: null,
      $and: [
        {
          $or: [
            { remindAt: trusted({ $lte: now, $ne: null }) },
            { remindAt: null, dueAt: trusted({ $lte: now, $ne: null }) },
          ],
        },
        { $or: [{ snoozedUntil: null }, { snoozedUntil: trusted({ $lte: now }) }] },
      ],
    };
  }
}
