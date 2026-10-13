import { Types, trusted, type FilterQuery } from 'mongoose';
import {
  DEFAULT_PAGE_SIZE,
  type AdminApplySuggestionsInput,
  type AdminCompanyDto,
  type AdminCompanyDetailDto,
  type AdminCreateCompanyInput,
  type CompanyLookupDto,
  type CompanyLookupRequestInput,
  type AdminUpdateCompanyInput,
  type AdminListCompaniesQuery,
  type AdminMergeCompanyInput,
  type CompanyDto,
  type VerifiableField,
} from '@hiretrail/shared';
import { Cursor } from '../../../core/http/cursor';
import { withTransaction } from '../../../core/db/transaction';
import {
  ConflictError,
  DuplicateError,
  NotFoundError,
  ValidationError,
} from '../../../core/errors/domain-errors';
import { CompanyModel, type CompanyDoc } from '../../companies/models/company.model';
import { CompanyNoteModel } from '../../companies/models/company-note.model';
import { CompanyMapper } from '../../companies/mappers/company.mapper';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { type CompanyLookupService } from '../../companies/services/company-lookup.service';
import { type UserCompanyNotesRepository } from '../../companies/repositories/user-company-notes.repository';
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
    private readonly ratingsRepo: UserCompanyNotesRepository,
    private readonly lookupService: CompanyLookupService,
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

  /** Public-web lookup for a company profile. Admin only, so it does not need a PRO plan. */
  public async lookup(
    actor: AdminActor,
    input: CompanyLookupRequestInput,
  ): Promise<CompanyLookupDto> {
    return this.lookupService.lookup(actor.id, input);
  }

  /** Adds a company to the shared directory, usually from a lookup the admin reviewed. */
  public async create(
    actor: AdminActor,
    input: AdminCreateCompanyInput,
  ): Promise<AdminCompanyDetailDto> {
    const normalizedName = CompanyRepository.normalizeName(input.name);
    const existing = await CompanyModel.findOne({
      ownerId: null,
      normalizedName,
      deletedAt: null,
    }).exec();
    if (existing) {
      throw new DuplicateError('This company is already in the directory', {
        existingId: existing._id.toString(),
      });
    }

    const baseSlug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'company';
    const slugTaken = await CompanyModel.exists({ ownerId: null, slug: baseSlug });
    const slug = slugTaken ? `${baseSlug}-${Date.now().toString(36)}` : baseSlug;

    const created = await CompanyModel.create({
      ownerId: null,
      name: input.name,
      normalizedName,
      slug,
      website: input.website || undefined,
      careersUrl: input.careersUrl || undefined,
      country: input.country || undefined,
      city: input.city || undefined,
      industry: input.industry || undefined,
      size: input.size || undefined,
      description: input.description || undefined,
      linkedinUrl: input.linkedinUrl || undefined,
      contactEmail: input.contactEmail || undefined,
      foundedYear: input.foundedYear || undefined,
      region: input.region || undefined,
      tier: input.tier || null,
      techStack: input.techStack ?? [],
      source: {
        type: input.fromAiLookup ? 'AI_LOOKUP' : 'ADMIN',
        ref: (input.sourceUrls ?? []).slice(0, 5).join(' ') || undefined,
        importedAt: new Date(),
      },
      verification: { status: 'UNVERIFIED' },
      createdBy: new Types.ObjectId(actor.id),
    });

    await this.auditRepo.append({
      actorId: actor.id,
      action: 'COMPANY_CREATED',
      targetType: 'Company',
      targetId: created._id.toString(),
      before: null,
      after: {
        name: input.name,
        source: input.fromAiLookup ? 'AI_LOOKUP' : 'ADMIN',
        sourceUrls: input.sourceUrls ?? [],
      },
      reason: input.reason,
      ipHash: actor.ipHash,
    });
    return this.detail(created._id.toString());
  }

  /** Full company plus the average of every user's rating. Who rated is never exposed. */
  public async detail(companyId: string): Promise<AdminCompanyDetailDto> {
    const company = await this.requireGlobal(companyId);
    const summary = await this.ratingsRepo.ratingSummary(companyId);
    return {
      company: CompanyMapper.toDto(company),
      version: company.version,
      averageRating: summary.average,
      ratingCount: summary.count,
    };
  }

  /** Edits any field of a global company. The version check stops two admins overwriting each other. */
  public async update(
    actor: AdminActor,
    companyId: string,
    input: AdminUpdateCompanyInput,
  ): Promise<AdminCompanyDetailDto> {
    const before = await this.requireGlobal(companyId);
    const { version, reason, ...fields } = input;

    const set: Record<string, unknown> = {};
    const unset: Record<string, ''> = {};
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined) continue;
      if (value === null || value === '') unset[key] = '';
      else set[key] = value;
    }
    if (typeof fields.name === 'string') {
      set.normalizedName = CompanyRepository.normalizeName(fields.name);
    }
    if (Object.keys(set).length === 0 && Object.keys(unset).length === 0) {
      throw new ValidationError('Nothing to change');
    }

    let updated: CompanyDoc | null;
    try {
      updated = await CompanyModel.findOneAndUpdate(
        { _id: before._id, ownerId: null, deletedAt: null, version },
        {
          ...(Object.keys(set).length > 0 ? { $set: set } : {}),
          ...(Object.keys(unset).length > 0 ? { $unset: unset } : {}),
          $inc: { version: 1 },
        },
        { new: true, runValidators: true },
      ).exec();
    } catch (err) {
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictError('Another company already uses that name');
      }
      throw err;
    }
    if (!updated) throw new ConflictError('This company was changed by someone else. Reload it.');

    await this.auditRepo.append({
      actorId: actor.id,
      action: 'COMPANY_UPDATED',
      targetType: 'Company',
      targetId: companyId,
      before: Object.fromEntries(
        Object.keys({ ...set, ...unset }).map((k) => [
          k,
          (before.toObject() as Record<string, unknown>)[k] ?? null,
        ]),
      ),
      after: { ...set, ...Object.fromEntries(Object.keys(unset).map((k) => [k, null])) },
      reason,
      ipHash: actor.ipHash,
    });
    return this.detail(companyId);
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
        if (existing) {
          if (note.notesHtml) {
            await CompanyNoteModel.create(
              [
                {
                  userId: note.userId,
                  companyId: into._id,
                  bodyHtml: note.notesHtml,
                  createdAt: note.updatedAt,
                },
              ],
              { session },
            );
          }
          await UserCompanyNotesModel.deleteOne({ _id: note._id }, { session });
        } else
          await UserCompanyNotesModel.updateOne(
            { _id: note._id },
            { $set: { companyId: into._id } },
            { session },
          );
      }

      await CompanyNoteModel.updateMany(
        { companyId: from._id },
        { $set: { companyId: into._id } },
        { session },
      );

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
