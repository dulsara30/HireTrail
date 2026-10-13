import { Types, trusted } from 'mongoose';
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

  public async setRating(
    userId: string,
    companyId: string,
    myRating: number | null,
  ): Promise<UserCompanyNotesDoc> {
    const result = await this.model
      .findOneAndUpdate(
        { userId: new Types.ObjectId(userId), companyId: new Types.ObjectId(companyId) },
        { $set: { myRating } },
        { upsert: true, new: true, runValidators: true },
      )
      .exec();
    return result as UserCompanyNotesDoc;
  }

  /**
   * Atomically takes the legacy single note (and clears it), so it is copied into the notes list
   * exactly once even when two requests arrive together.
   */
  public async takeLegacyNote(
    userId: string,
    companyId: string,
  ): Promise<{ html: string; at: Date } | null> {
    const before = await this.model
      .findOneAndUpdate(
        {
          userId: new Types.ObjectId(userId),
          companyId: new Types.ObjectId(companyId),
          notesHtml: trusted({ $nin: [null, ''] }),
        },
        { $set: { notesHtml: null } },
        { new: false, timestamps: false },
      )
      .exec();
    return before?.notesHtml ? { html: before.notesHtml, at: before.updatedAt } : null;
  }

  /** Mean and count of every user's rating for one company. No user ids leave this method. */
  public async ratingSummary(
    companyId: string,
  ): Promise<{ average: number | null; count: number }> {
    if (!Types.ObjectId.isValid(companyId)) return { average: null, count: 0 };
    const rows = await this.model
      .aggregate<{ avg: number; count: number }>([
        { $match: { companyId: new Types.ObjectId(companyId), myRating: { $ne: null } } },
        { $group: { _id: null, avg: { $avg: '$myRating' }, count: { $sum: 1 } } },
      ])
      .exec();
    const row = rows[0];
    return row
      ? { average: Math.round(row.avg * 10) / 10, count: row.count }
      : { average: null, count: 0 };
  }
}
