import { Types, trusted, type FilterQuery } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  type AdminApplySuggestionsInput,
  type AdminCompanyDto,
  type AdminListCompaniesQuery,
  type AdminMergeCompanyInput,
  type CompanyDto,
  type VerifiableField,
} from '@hiretrail/shared';
import { Cursor } from '../../../core/http/cursor';
import { withTransaction } from '../../../core/db/transaction';
import { NotFoundError, ValidationError } from '../../../core/errors/domain-errors';
import { CompanyModel, type CompanyDoc } from '../../companies/models/company.model';
import { UserCompanyNotesModel } from '../../companies/models/user-company-notes.model';
import { ApplicationModel } from '../../applications/models/application.model';
import { type CompanyVerificationService } from '../../companies/services/company-verification.service';
import { type AuditLogRepository } from '../repositories/audit-log.repository';
import { type AdminActor } from './admin-user.service';

const escapeRegex = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Global (shared) companies only. Private companies belong to users and are never touched here. */
export class AdminCompanyService {
  constructor(
    private readonly verificationService: CompanyVerificationService,
    private readonly auditRepo: AuditLogRepository,
  ) {}

  private toDto(c: CompanyDoc): AdminCompanyDto {
    return {
      id: c._id.toString(),
      name: c.name,
      slug: c.slug,
      website: c.website ?? null,
      country: c.country ?? null,
      verificationScore: c.verification?.score ?? null,
      hasConflicts: Boolean(c.conflicts && Object.keys(c.conflicts).length > 0),
    };
  }

  public async list(
    query: AdminListCompaniesQuery,
  ): Promise<{ items: AdminCompanyDto[]; nextCursor: string | null }> {
    const limit = Math.min(query.limit ?? DEFAULT_PAGE_SIZE, 100);
    const filter: FilterQuery<CompanyDoc> = { ownerId: null, deletedAt: null };
    if (query.q) {
      const regex = new RegExp(escapeRegex(query.q.trim()), 'i');
      filter.$or = [{ name: regex }, { aliases: regex }];
    }
    const decoded = query.cursor ? Cursor.decode<{ _id: string }>(query.cursor) : null;
    if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
      filter._id = trusted({ $gt: new Types.ObjectId(decoded._id) });
    }
    const rows = await CompanyModel.find(filter)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .exec();
    const hasMore = rows.length > limit;
    const page = hasMore ? rows.slice(0, limit) : rows;
    const last = page[page.length - 1];
    return {
      items: page.map((c) => this.toDto(c)),
      nextCursor: hasMore && last ? Cursor.encode({ _id: last._id.toString() }) : null,
    };
  }

  /** Moves every application and personal note to the target, keeps the old name as an alias. */
  public async merge(
    actor: AdminActor,
    fromId: string,
    input: AdminMergeCompanyInput,
  ): Promise<AdminCompanyDto> {
    if (fromId === input.intoId) throw new ValidationError('Choose a different target company');
    const [from, into] = await Promise.all([
      this.requireGlobal(fromId),
      this.requireGlobal(input.intoId),
    ]);

    await withTransaction(async (session) => {
      const apps = await ApplicationModel.updateMany(
        { companyId: from._id },
        { $set: { companyId: into._id } },
        { session },
      );

      // One note per user and company: keep the target's note when both exist
      const notes = await UserCompanyNotesModel.find({ companyId: from._id }).session(session);
      for (const note of notes) {
        const existing = await UserCompanyNotesModel.findOne({
          userId: note.userId,
          companyId: into._id,
        }).session(session);
        if (existing) await UserCompanyNotesModel.deleteOne({ _id: note._id }, { session });
        else
          await UserCompanyNotesModel.updateOne(
            { _id: note._id },
            { $set: { companyId: into._id } },
            { session },
          );
      }

      const aliases = Array.from(
        new Set([...(into.aliases ?? []), from.name, ...(from.aliases ?? [])]),
      ).filter((a) => a.toLowerCase() !== into.name.toLowerCase());
      await CompanyModel.updateOne(
        { _id: into._id },
        { $set: { aliases }, $inc: { version: 1 } },
        { session },
      );
      await CompanyModel.updateOne(
        { _id: from._id },
        { $set: { deletedAt: new Date() } },
        { session },
      );

      await this.auditRepo.append(
        {
          actorId: actor.id,
          action: 'COMPANY_MERGED',
          targetType: 'Company',
          targetId: fromId,
          before: { id: fromId, name: from.name },
          after: {
            intoId: input.intoId,
            intoName: into.name,
            applicationsMoved: apps.modifiedCount,
          },
          reason: input.reason,
          ipHash: actor.ipHash,
        },
        session,
      );
    });

    const refreshed = await CompanyModel.findById(into._id).exec();
    return this.toDto(refreshed ?? into);
  }

  public async applyVerification(
    actor: AdminActor & { role: 'USER' | 'ADMIN'; plan: 'FREE' | 'PRO' },
    companyId: string,
    verificationId: string,
    input: AdminApplySuggestionsInput,
  ): Promise<CompanyDto> {
    const company = await this.requireGlobal(companyId);
    const result = await this.verificationService.applySuggestions(
      { id: actor.id, role: actor.role, plan: actor.plan },
      companyId,
      verificationId,
      input.fields as VerifiableField[],
      true,
    );
    await this.auditRepo.append({
      actorId: actor.id,
      action: 'VERIFICATION_APPLIED',
      targetType: 'Company',
      targetId: companyId,
      before: { name: company.name },
      after: { verificationId, fields: input.fields },
      reason: input.reason,
      ipHash: actor.ipHash,
    });
    return result;
  }

  private async requireGlobal(id: string): Promise<CompanyDoc> {
    if (!Types.ObjectId.isValid(id)) throw new NotFoundError();
    const company = await CompanyModel.findOne({
      _id: new Types.ObjectId(id),
      ownerId: null,
      deletedAt: null,
    }).exec();
    if (!company) throw new NotFoundError(undefined, 'Global company not found');
    return company;
  }
}
