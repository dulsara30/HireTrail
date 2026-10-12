import { Types } from 'mongoose';
import {
  CompanyVerificationModel,
  type CompanyVerificationDoc,
} from '../models/company-verification.model';

/**
 * Verification rows belong to a company, not to one user: a stored result is shared for 30 days.
 * Callers must have resolved company visibility (owner or global) before using these methods.
 */
export class CompanyVerificationRepository {
  constructor(private readonly model = CompanyVerificationModel) {}

  public async create(data: Partial<CompanyVerificationDoc>): Promise<CompanyVerificationDoc> {
    return this.model.create(data);
  }

  public async findLatestForCompany(companyId: string): Promise<CompanyVerificationDoc | null> {
    return this.model
      .findOne({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async findLatestByUser(
    companyId: string,
    userId: string,
  ): Promise<CompanyVerificationDoc | null> {
    return this.model
      .findOne({
        companyId: new Types.ObjectId(companyId),
        requestedBy: new Types.ObjectId(userId),
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async listForCompany(companyId: string, limit = 10): Promise<CompanyVerificationDoc[]> {
    return this.model
      .find({ companyId: new Types.ObjectId(companyId) })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  public async findByIdForCompany(
    companyId: string,
    id: string,
  ): Promise<CompanyVerificationDoc | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return this.model
      .findOne({ _id: new Types.ObjectId(id), companyId: new Types.ObjectId(companyId) })
      .exec();
  }
}
