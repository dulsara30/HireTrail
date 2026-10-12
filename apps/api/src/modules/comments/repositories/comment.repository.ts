import { Types, ClientSession } from 'mongoose';
import { BaseRepository } from '../../../core/base/base.repository';
import { CommentModel, type CommentDoc } from '../models/comment.model';

export class CommentRepository extends BaseRepository<CommentDoc> {
  constructor() {
    super(CommentModel);
  }

  public async listForApplication(userId: string, applicationId: string): Promise<CommentDoc[]> {
    return this.model
      .find({
        userId: new Types.ObjectId(userId),
        applicationId: new Types.ObjectId(applicationId),
        deletedAt: null,
      })
      .sort({ createdAt: -1 })
      .exec();
  }

  public async createComment(
    data: Partial<CommentDoc>,
    session?: ClientSession,
  ): Promise<CommentDoc> {
    const docs = await this.model.create([data], { session });
    return docs[0] as CommentDoc;
  }
}
