import { Types, trusted, type FilterQuery } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  type AdminChangePlanInput,
  type AdminChangeStatusInput,
  type AdminListUsersQuery,
  type AdminUserDetailDto,
  type AdminUserDto,
} from '@hiretrail/shared';
import { Cursor } from '../../../core/http/cursor';
import { withTransaction } from '../../../core/db/transaction';
import { ForbiddenError, NotFoundError } from '../../../core/errors/domain-errors';
import { UserModel, type UserDoc } from '../../auth/models/user.model';
import { SessionModel } from '../../auth/models/session.model';
import { type SessionRepository } from '../../auth/repositories/session.repository';
import { ApplicationModel } from '../../applications/models/application.model';
import { CommentModel } from '../../comments/models/comment.model';
import { OptionModel } from '../../options/models/option.model';
import { CompanyModel } from '../../companies/models/company.model';
import { AiUsageModel } from '../../ai/models/ai-usage.model';
import { type AuditLogRepository } from '../repositories/audit-log.repository';

export interface AdminActor {
  id: string;
  ipHash: string | null;
}

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Admin views of accounts. Returns metadata and counts only: never applications,
 * comments, notes or any other user content (docs/06-security.md §4).
 */
export class AdminUserService {
  constructor(
    private readonly sessionRepo: SessionRepository,
    private readonly auditRepo: AuditLogRepository,
  ) {}

  private toDto(u: UserDoc): AdminUserDto {
    return {
      id: u._id.toString(),
      email: u.email,
      name: u.name,
      role: u.role,
      plan: u.plan,
      status: u.status,
      emailVerified: Boolean(u.emailVerifiedAt),
      createdAt: u.createdAt.toISOString(),
      lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
    };
  }

  public async list(
    query: AdminListUsersQuery,
  ): Promise<{ items: AdminUserDto[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, 100);
    const filter: FilterQuery<UserDoc> = {};
    if (query.plan) filter.plan = query.plan;
    if (query.role) filter.role = query.role;
    if (query.status) filter.status = query.status;
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ email: regex }, { name: regex }];
    }
    const decoded = query.cursor ? Cursor.decode<{ _id: string }>(query.cursor) : null;
    if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
      filter._id = trusted({ $lt: new Types.ObjectId(decoded._id) });
    }

    const rows = await UserModel.find(filter)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .exec();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((u) => this.toDto(u)),
      nextCursor: hasMore && last ? Cursor.encode({ _id: last._id.toString() }) : null,
    };
  }

  public async detail(id: string): Promise<AdminUserDetailDto> {
    const user = await this.requireUser(id);
    const userId = user._id;
    const monthStart = new Date().toISOString().slice(0, 7);

    const [applications, comments, options, privateCompanies, activeSessions, usage] =
      await Promise.all([
        ApplicationModel.countDocuments({ userId, deletedAt: null }).exec(),
        CommentModel.countDocuments({ userId, deletedAt: null }).exec(),
        OptionModel.countDocuments({ userId }).exec(),
        CompanyModel.countDocuments({ ownerId: userId, deletedAt: null }).exec(),
        SessionModel.countDocuments({ userId, revokedAt: null }).exec(),
        AiUsageModel.aggregate<{
          calls: number;
          failures: number;
          inputTokens: number;
          outputTokens: number;
        }>([
          { $match: { userId, day: { $gte: `${monthStart}-01` } } },
          {
            $group: {
              _id: null,
              calls: { $sum: 1 },
              failures: { $sum: { $cond: [{ $eq: ['$outcome', 'ERROR'] }, 1, 0] } },
              inputTokens: { $sum: '$inputTokens' },
              outputTokens: { $sum: '$outputTokens' },
            },
          },
        ]).exec(),
      ]);

    const u = usage[0];
    return {
      ...this.toDto(user),
      hasPassword: Boolean(user.passwordHash),
      googleLinked: Boolean(user.google),
      planMeta: user.planMeta
        ? {
            source: user.planMeta.source,
            updatedAt: user.planMeta.updatedAt ? user.planMeta.updatedAt.toISOString() : null,
            reason: user.planMeta.reason ?? null,
          }
        : null,
      counts: { applications, comments, options, privateCompanies },
      activeSessions,
      aiUsageThisMonth: {
        calls: u?.calls ?? 0,
        failures: u?.failures ?? 0,
        inputTokens: u?.inputTokens ?? 0,
        outputTokens: u?.outputTokens ?? 0,
      },
    };
  }

  /** Takes effect on the user's next request: the plan is always read fresh from the DB. */
  public async changePlan(
    actor: AdminActor,
    id: string,
    input: AdminChangePlanInput,
  ): Promise<AdminUserDto> {
    const user = await this.requireUser(id);
    const before = { plan: user.plan };

    const updated = await withTransaction(async (session) => {
      const doc = await UserModel.findOneAndUpdate(
        { _id: user._id },
        {
          $set: {
            plan: input.plan,
            planMeta: {
              source: 'MANUAL',
              updatedAt: new Date(),
              updatedBy: actor.id,
              reason: input.reason,
            },
          },
        },
        { new: true, session },
      );
      await this.auditRepo.append(
        {
          actorId: actor.id,
          action: 'USER_PLAN_CHANGED',
          targetType: 'User',
          targetId: id,
          before,
          after: { plan: input.plan },
          reason: input.reason,
          ipHash: actor.ipHash,
        },
        session,
      );
      return doc;
    });
    return this.toDto(updated ?? user);
  }

  /** Suspending revokes every session in the same transaction. */
  public async changeStatus(
    actor: AdminActor,
    id: string,
    input: AdminChangeStatusInput,
  ): Promise<AdminUserDto> {
    if (actor.id === id) throw new ForbiddenError('You cannot change your own account status');
    const user = await this.requireUser(id);
    const before = { status: user.status };

    const updated = await withTransaction(async (session) => {
      const doc = await UserModel.findOneAndUpdate(
        { _id: user._id },
        { $set: { status: input.status } },
        { new: true, session },
      );
      if (input.status === 'SUSPENDED') {
        await this.sessionRepo.revokeAllUserSessions(user._id, 'SUSPENDED', undefined, session);
      }
      await this.auditRepo.append(
        {
          actorId: actor.id,
          action: input.status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED',
          targetType: 'User',
          targetId: id,
          before,
          after: { status: input.status },
          reason: input.reason,
          ipHash: actor.ipHash,
        },
        session,
      );
      return doc;
    });
    return this.toDto(updated ?? user);
  }

  private async requireUser(id: string): Promise<UserDoc> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError();
    const user = await UserModel.findById(id).exec();
    if (!user) throw new NotFoundError();
    return user;
  }
}
