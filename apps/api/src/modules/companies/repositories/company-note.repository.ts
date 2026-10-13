import { Types } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { CompanyNoteModel, type CompanyNoteDoc } from '../models/company-note.model';

const MAX_NOTES = 200;

export class CompanyNoteRepository extends BaseRepository<CompanyNoteDoc> {
  constructor() {
    super(CompanyNoteModel);
  }

  public async listForCompany(userId: string, companyId: string): Promise<CompanyNoteDoc[]> {
    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        companyId: new Types.ObjectId(companyId),
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .limit(MAX_NOTES)
      .exec();
  }

  public async createNote(data: Partial<CompanyNoteDoc>): Promise<CompanyNoteDoc> {
    const docs = await this.model.create([data]);
    return docs[0] as CompanyNoteDoc;
  }
}
