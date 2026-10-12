import { CommentKind } from '../../schemas/comment.schema';

export interface CommentDto {
  id: string;
  userId: string;
  applicationId: string;
  kind: CommentKind;
  bodyHtml: string;
  dueAt?: string | null;
  doneAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export type ActivityType =
  | 'CREATED'
  | 'UPDATED'
  | 'STATUS_CHANGED'
  | 'ARCHIVED'
  | 'RESTORED'
  | 'DELETED'
  | 'COMMENT_ADDED'
  | 'COMMENT_EDITED'
  | 'COMMENT_DELETED'
  | 'AI_AUTOFILLED'
  | 'IMPORTED';

export interface ActivityChangeDto {
  field: string;
  from?: unknown;
  to?: unknown;
  changed?: boolean;
}

export interface ActivityDto {
  id: string;
  userId: string;
  actorId: string;
  actorType: 'USER' | 'SYSTEM' | 'AI';
  entityType: 'APPLICATION' | 'COMPANY';
  entityId: string;
  type: ActivityType;
  changes?: ActivityChangeDto[];
  summary: string;
  createdAt: string;
}
