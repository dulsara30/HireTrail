import { Types } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import {
  UserCompanyNotesModel,
  type UserCompanyNotesDoc,
} from '../models/user-company-notes.model';

export class UserCompanyNotesRepository extends BaseRepository<UserCompanyNotesDoc> {
  constructor() {
    super(UserCompanyNotesModel);
  }

  public async findByCompany(
    userId: string,
    companyId: string,
  ): Promise<UserCompanyNotesDoc | null> {
    if (!Types.ObjectId.isValid(companyId)) return null;
    return this.model
      .findOne({
        userId: new Types.ObjectId(userId),
        companyId: new Types.ObjectId(companyId),
      })
      .exec();
  }

  public async upsertNotes(
    userId: string,
    companyId: string,
    data: { myRating?: number | null; notesHtml?: string | null },
  ): Promise<UserCompanyNotesDoc> {
    const updateObj: Record<string, unknown> = {};
    if (data.myRating !== undefined) updateObj.myRating = data.myRating;
    if (data.notesHtml !== undefined) updateObj.notesHtml = data.notesHtml;

    const result = await this.model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          companyId: new Types.ObjectId(companyId),
        },
        { $set: updateObj },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();

    return result as UserCompanyNotesDoc;
  }
}
