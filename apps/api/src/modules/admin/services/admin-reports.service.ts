import { Types, trusted } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  type AdminAiUsageDto,
  type AdminAiUsageQuery,
  type AdminAuditLogsQuery,
  type AuditLogDto,
} from '@hiretrail/shared';
import { UserModel } from '../../auth/models/user.model';
import { AiUsageModel } from '../../ai/models/ai-usage.model';
import { type AuditLogRepository } from '../repositories/audit-log.repository';

/** Read-only admin reports: the audit log and AI usage totals (no user content). */
export class AdminReportsService {
  constructor(private readonly auditRepo: AuditLogRepository) {}

  public async auditLogs(
    query: AdminAuditLogsQuery,
  ): Promise<{ items: AuditLogDto[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, 100);
    const { items, nextCursor } = await this.auditRepo.list(
      { action: query.action, targetId: query.targetId, cursor: query.cursor },
      limit,
    );

    const actorIds = Array.from(
      new Set(items.map((i) => i.actorId?.toString()).filter((v): v is string => Boolean(v))),
    );
    const actors = actorIds.length
      ? await UserModel.find({
          _id: trusted({ $in: actorIds.map((id) => new Types.ObjectId(id)) }),
        })
          .select('email')
          .exec()
      : [];
    const emailById = new Map(actors.map((a) => [a._id.toString(), a.email]));

    return {
      items: items.map((i) => ({
        id: i._id.toString(),
        actorId: i.actorId ? i.actorId.toString() : null,
        actorEmail: i.actorId ? (emailById.get(i.actorId.toString()) ?? null) : null,
        actorType: i.actorType,
        action: i.action,
        targetType: i.targetType,
        targetId: i.targetId ? i.targetId.toString() : null,
        before: i.before,
        after: i.after,
        reason: i.reason,
        createdAt: i.createdAt.toISOString(),
      })),
      nextCursor,
    };
  }

  public async aiUsage(query: AdminAiUsageQuery): Promise<AdminAiUsageDto> {
    const days = query.days ?? 14;
    const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    const [byDay, byUser] = await Promise.all([
      AiUsageModel.aggregate<{
        _id: { day: string; feature: string };
        calls: number;
        failures: number;
        inputTokens: number;
        outputTokens: number;
      }>([
        { $match: { day: { $gte: since } } },
        {
          $group: {
            _id: { day: '$day', feature: '$feature' },
            calls: { $sum: 1 },
            failures: { $sum: { $cond: [{ $eq: ['$outcome', 'ERROR'] }, 1, 0] } },
            inputTokens: { $sum: '$inputTokens' },
            outputTokens: { $sum: '$outputTokens' },
          },
        },
      ]).exec(),
      AiUsageModel.aggregate<{ _id: Types.ObjectId; calls: number; failures: number }>([
        { $match: { day: { $gte: since } } },
        {
          $group: {
            _id: '$userId',
            calls: { $sum: 1 },
            failures: { $sum: { $cond: [{ $eq: ['$outcome', 'ERROR'] }, 1, 0] } },
          },
        },
        { $sort: { calls: -1 } },
        { $limit: 10 },
      ]).exec(),
    ]);

    const perDay = new Map<string, AdminAiUsageDto['days'][number]>();
    for (const row of byDay) {
      const entry = perDay.get(row._id.day) ?? {
        day: row._id.day,
        calls: 0,
        failures: 0,
        inputTokens: 0,
        outputTokens: 0,
        byFeature: {},
      };
      entry.calls += row.calls;
      entry.failures += row.failures;
      entry.inputTokens += row.inputTokens;
      entry.outputTokens += row.outputTokens;
      entry.byFeature[row._id.feature] = (entry.byFeature[row._id.feature] ?? 0) + row.calls;
      perDay.set(row._id.day, entry);
    }

    const users = byUser.length
      ? await UserModel.find({ _id: trusted({ $in: byUser.map((u) => u._id) }) })
          .select('email')
          .exec()
      : [];
    const emailById = new Map(users.map((u) => [u._id.toString(), u.email]));

    return {
      days: Array.from(perDay.values()).sort((a, b) => (a.day < b.day ? 1 : -1)),
      topUsers: byUser.map((u) => ({
        userId: u._id.toString(),
        email: emailById.get(u._id.toString()) ?? null,
        calls: u.calls,
        failures: u.failures,
      })),
    };
  }
}
