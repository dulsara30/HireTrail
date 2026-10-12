import { Types, trusted, type ClientSession, type FilterQuery } from 'mongoose';
import { Cursor } from '../../../core/http/cursor';
import { AuditLogModel, type AuditLogDoc, type AuditAction } from '../models/audit-log.model';

export interface NewAuditLog {
  actorId: string | null;
  action: AuditAction;
  targetType: string;
  targetId: string | null;
  before?: unknown;
  after?: unknown;
  reason?: string | null;
  ipHash?: string | null;
}

/** Append-only: this repository intentionally has no update or delete method. */
export class AuditLogRepository {
  constructor(private readonly model = AuditLogModel) {}

  public async append(entry: NewAuditLog, session?: ClientSession): Promise<void> {
    await this.model.create(
      [
        {
          actorId: entry.actorId ? new Types.ObjectId(entry.actorId) : null,
          actorType: entry.actorId ? 'USER' : 'SYSTEM',
          action: entry.action,
          targetType: entry.targetType,
          targetId: entry.targetId ? new Types.ObjectId(entry.targetId) : null,
          before: entry.before ?? null,
          after: entry.after ?? null,
          reason: entry.reason ?? null,
          ipHash: entry.ipHash ?? null,
        },
      ],
      { session },
    );
  }

  public async list(
    filter: { action?: string; targetId?: string; cursor?: string },
    limit: number,
  ): Promise<{ items: AuditLogDoc[]; nextCursor: string | null }> {
    const query: FilterQuery<AuditLogDoc> = {};
    if (filter.action) query.action = filter.action;
    if (filter.targetId && Types.ObjectId.isValid(filter.targetId)) {
      query.targetId = new Types.ObjectId(filter.targetId);
    }
    const decoded = filter.cursor ? Cursor.decode<{ _id: string }>(filter.cursor) : null;
    if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
      query._id = trusted({ $lt: new Types.ObjectId(decoded._id) });
    }

    const rows = await this.model
      .find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();
    const hasMore = rows.length > limit;
    const items = hasMore ? rows.slice(0, limit) : rows;
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: hasMore && last ? Cursor.encode({ _id: last._id.toString() }) : null,
    };
  }
}
