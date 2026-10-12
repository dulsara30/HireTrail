import { Types, type FilterQuery, type ClientSession } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { CompanyModel, type CompanyDoc } from '../models/company.model';

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
}
