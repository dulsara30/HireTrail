import { Types, type FilterQuery, type ClientSession, trusted } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { CompanyModel, type CompanyDoc } from '../models/company.model';

export interface CompanyFilterOptions {
  q?: string;
  region?: 'LOCAL' | 'FOREIGN';
  tier?: 'A' | 'B';
  verification?: 'VERIFIED' | 'UNVERIFIED' | 'FAILED';
  cursor?: string;
  limit?: number;
}

export class CompanyRepository extends BaseRepository<CompanyDoc> {
  constructor() {
    super(CompanyModel);
  }

  public static normalizeName(name: string): string {
    return name.toLowerCase().replace(/[^a-z0-9]/g, '');
  }

  public async findVisibleById(userId: string, id: string): Promise<CompanyDoc | null> {
    if (!Types.ObjectId.isValid(id)) {
      return null;
    }
    return this.model
      .findOne({
        _id: new Types.ObjectId(id),
        deletedAt: null,
        $or: [{ ownerId: null }, { ownerId: new Types.ObjectId(userId) }],
      })
      .exec();
  }

  public async findVisibleBySlugOrId(userId: string, idOrSlug: string): Promise<CompanyDoc | null> {
    if (Types.ObjectId.isValid(idOrSlug)) {
      const byId = await this.findVisibleById(userId, idOrSlug);
      if (byId) return byId;
    }

    // Slug lookup: private first, then global
    const privateCompany = await this.model
      .findOne({
        ownerId: new Types.ObjectId(userId),
        slug: idOrSlug,
        deletedAt: null,
      })
      .exec();

    if (privateCompany) return privateCompany;

    return this.model
      .findOne({
        ownerId: null,
        slug: idOrSlug,
        deletedAt: null,
      })
      .exec();
  }

  public async findVisibleByNormalizedName(
    userId: string,
    normalizedName: string,
  ): Promise<CompanyDoc | null> {
    // Check private first, then global
    const privateCompany = await this.model
      .findOne({
        ownerId: new Types.ObjectId(userId),
        normalizedName,
        deletedAt: null,
      })
      .exec();

    if (privateCompany) return privateCompany;

    return this.model
      .findOne({
        ownerId: null,
        normalizedName,
        deletedAt: null,
      })
      .exec();
  }

  public async findVisibleByAlias(userId: string, alias: string): Promise<CompanyDoc | null> {
    return this.model
      .findOne({
        aliases: alias,
        deletedAt: null,
        $or: [{ ownerId: null }, { ownerId: new Types.ObjectId(userId) }],
      })
      .exec();
  }

  public async listVisible(
    userId: string,
    filter: CompanyFilterOptions,
  ): Promise<{ items: CompanyDoc[]; nextCursor: string | null; totalCount: number }> {
    const limit = Math.min(Math.max(filter.limit || 20, 1), 100);
    const query: FilterQuery<CompanyDoc> = {
      deletedAt: null,
      $or: [{ ownerId: null }, { ownerId: new Types.ObjectId(userId) }],
    };

    if (filter.region) {
      query.region = filter.region;
    }

    if (filter.tier) {
      query.tier = filter.tier;
    }

    if (filter.verification) {
      query['verification.status'] = filter.verification;
    }

    if (filter.q && filter.q.trim()) {
      const regex = new RegExp(filter.q.trim(), 'i');
      query.$and = [
        {
          $or: [{ name: regex }, { aliases: regex }],
        },
      ];
    }

    const totalCount = await this.model.countDocuments(query);

    const pageQuery: FilterQuery<CompanyDoc> = { ...query };
    if (filter.cursor && Types.ObjectId.isValid(filter.cursor)) {
      pageQuery._id = trusted({ $gt: new Types.ObjectId(filter.cursor) });
    }

    const items = await this.model
      .find(pageQuery)
      .sort({ _id: 1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems[resultItems.length - 1];
    const nextCursor = hasMore && lastItem ? lastItem._id.toString() : null;

    return { items: resultItems, nextCursor, totalCount };
  }

  public async searchVisible(
    userId: string,
    searchTerm?: string,
    limit = 20,
  ): Promise<CompanyDoc[]> {
    const query: FilterQuery<CompanyDoc> = {
      deletedAt: null,
      $or: [{ ownerId: null }, { ownerId: new Types.ObjectId(userId) }],
    };

    if (searchTerm && searchTerm.trim()) {
      const regex = new RegExp(searchTerm.trim(), 'i');
      query.$and = [
        {
          $or: [{ name: regex }, { aliases: regex }],
        },
      ];
    }

    return this.model.find(query).limit(limit).sort({ name: 1 }).exec();
  }

  /** Callers must have resolved visibility first. Global companies share one verification result. */
  public async setVerification(
    companyId: string,
    verification: NonNullable<CompanyDoc['verification']>,
  ): Promise<void> {
    await this.model
      .updateOne({ _id: new Types.ObjectId(companyId) }, { $set: { verification } })
      .exec();
  }

  /** Applies verified values. Global companies are marked ADMIN so the seed never overwrites them. */
  public async applyFields(
    companyId: string,
    updates: Record<string, string>,
    markAdminEdited: boolean,
  ): Promise<CompanyDoc | null> {
    const $set: Record<string, unknown> = { ...updates };
    if (markAdminEdited) $set['source.type'] = 'ADMIN';
    return this.model
      .findOneAndUpdate(
        { _id: new Types.ObjectId(companyId), deletedAt: null },
        { $set, $inc: { version: 1 } },
        { new: true },
      )
      .exec();
  }

  public async createPrivate(
    userId: string,
    data: Partial<CompanyDoc>,
    session?: ClientSession,
  ): Promise<CompanyDoc> {
    const docs = await this.model.create(
      [
        {
          ...data,
          ownerId: new Types.ObjectId(userId),
          createdBy: new Types.ObjectId(userId),
          deletedAt: null,
        },
      ],
      { session },
    );
    return docs[0] as CompanyDoc;
  }

  public async updatePrivate(
    userId: string,
    companyId: string,
    updates: Partial<CompanyDoc>,
  ): Promise<CompanyDoc | null> {
    if (!Types.ObjectId.isValid(companyId)) return null;
    return this.model
      .findOneAndUpdate(
        {
          _id: new Types.ObjectId(companyId),
          ownerId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: updates },
        { new: true, runValidators: true },
      )
      .exec();
  }

  public async softDeletePrivate(userId: string, companyId: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(companyId)) return false;
    const res = await this.model
      .updateOne(
        {
          _id: new Types.ObjectId(companyId),
          ownerId: new Types.ObjectId(userId),
          deletedAt: null,
        },
        { $set: { deletedAt: new Date() } },
      )
      .exec();
    return res.modifiedCount > 0;
  }
}
