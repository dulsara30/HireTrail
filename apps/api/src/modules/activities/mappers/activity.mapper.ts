import { ActivityDoc } from '../models/activity.model';
import { ActivityDto, ActivityType } from '@hiretrail/shared';

export class ActivityMapper {
  public static toDto(doc: ActivityDoc): ActivityDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      actorId: doc.actorId.toString(),
      actorType: doc.actorType,
      entityType: doc.entityType,
      entityId: doc.entityId.toString(),
      type: doc.type as ActivityType,
      changes: doc.changes,
      summary: doc.summary,
      createdAt: doc.createdAt.toISOString(),
    };
  }
}
