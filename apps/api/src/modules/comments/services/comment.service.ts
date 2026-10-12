import { Types } from 'mongoose';
import { CreateCommentInput, UpdateCommentInput, CommentDto } from '@hiretrail/shared';
import { CommentRepository } from '../repositories/comment.repository';
import { CommentMapper } from '../mappers/comment.mapper';
import { ActivityRepository } from '../../activities/repositories/activity.repository';
import { HtmlSanitizer } from '../../../core/security/html-sanitizer';
import { NotFoundError } from '../../../core/errors/domain-errors';
import { withTransaction } from '../../../core/db/transaction';
import { ApplicationModel } from '../../applications/models/application.model';

export class CommentService {
  constructor(
    private readonly commentRepository: CommentRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  public async listForApplication(userId: string, applicationId: string): Promise<CommentDto[]> {
    const comments = await this.commentRepository.listForApplication(userId, applicationId);
    return comments.map(CommentMapper.toDto);
  }

  public async create(
    userId: string,
    applicationId: string,
    input: CreateCommentInput,
  ): Promise<CommentDto> {
    const cleanHtml = HtmlSanitizer.sanitize(input.bodyHtml);

    return withTransaction(async (session) => {
      const comment = await this.commentRepository.createComment(
        {
          userId: new Types.ObjectId(userId),
          applicationId: new Types.ObjectId(applicationId),
          kind: input.kind,
          bodyHtml: cleanHtml,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          deletedAt: null,
        },
        session,
      );

      // Update application lastActivityAt
      await ApplicationModel.updateOne(
        { _id: new Types.ObjectId(applicationId), userId: new Types.ObjectId(userId) },
        { $set: { lastActivityAt: new Date() } },
        { session },
      );

      // Record activity
      const summary =
        input.kind === 'FOLLOW_UP'
          ? 'Added follow-up task'
          : input.kind === 'INTERVIEW'
            ? 'Added interview note'
            : 'Added note';

      await this.activityRepository.create(
        {
          userId: new Types.ObjectId(userId),
          actorId: new Types.ObjectId(userId),
          actorType: 'USER',
          entityType: 'APPLICATION',
          entityId: new Types.ObjectId(applicationId),
          type: 'COMMENT_ADDED',
          changes: [],
          summary,
        },
        session,
      );

      return CommentMapper.toDto(comment);
    });
  }

  public async update(userId: string, id: string, input: UpdateCommentInput): Promise<CommentDto> {
    const changes: Record<string, unknown> = {};
    if (input.bodyHtml !== undefined) {
      changes.bodyHtml = HtmlSanitizer.sanitize(input.bodyHtml);
      changes.editedAt = new Date();
    }
    if (input.dueAt !== undefined) {
      changes.dueAt = input.dueAt ? new Date(input.dueAt) : null;
    }
    if (input.done !== undefined) {
      changes.doneAt = input.done ? new Date() : null;
    }

    const updated = await this.commentRepository.updateOwnedWithVersion(userId, id, input.version, {
      $set: changes,
    });

    // Update application lastActivityAt and log activity
    await ApplicationModel.updateOne(
      { _id: updated.applicationId, userId: new Types.ObjectId(userId) },
      { $set: { lastActivityAt: new Date() } },
    );

    await this.activityRepository.create({
      userId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(userId),
      actorType: 'USER',
      entityType: 'APPLICATION',
      entityId: updated.applicationId,
      type: 'COMMENT_EDITED',
      changes: [],
      summary:
        input.done !== undefined
          ? input.done
            ? 'Marked follow-up as done'
            : 'Marked follow-up as pending'
          : 'Edited note',
    });

    return CommentMapper.toDto(updated);
  }

  public async delete(userId: string, id: string): Promise<void> {
    const comment = await this.commentRepository.findOwnedById(userId, id);
    if (!comment) {
      throw new NotFoundError();
    }

    await this.commentRepository.softDeleteOwned(userId, id);

    await this.activityRepository.create({
      userId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(userId),
      actorType: 'USER',
      entityType: 'APPLICATION',
      entityId: comment.applicationId,
      type: 'COMMENT_DELETED',
      changes: [],
      summary: 'Deleted comment',
    });
  }
}
