import { CommentDoc } from '../models/comment.model';
import { CommentDto } from '@hiretrail/shared';

export class CommentMapper {
  public static toDto(doc: CommentDoc): CommentDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      applicationId: doc.applicationId.toString(),
      kind: doc.kind,
      bodyHtml: doc.bodyHtml,
      dueAt: doc.dueAt ? doc.dueAt.toISOString() : null,
      doneAt: doc.doneAt ? doc.doneAt.toISOString() : null,
      editedAt: doc.editedAt ? doc.editedAt.toISOString() : null,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
