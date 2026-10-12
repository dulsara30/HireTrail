import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface ActivityDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  actorId: Types.ObjectId;
  actorType: 'USER' | 'SYSTEM' | 'AI';
  entityType: 'APPLICATION' | 'COMPANY';
  entityId: Types.ObjectId;
  type: string;
  changes: Array<{
    field: string;
    from?: unknown;
    to?: unknown;
    changed?: boolean;
  }>;
  summary: string;
  createdAt: Date;
}

const activitySchema = new Schema<ActivityDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    actorId: { type: Schema.Types.ObjectId, required: true },
    actorType: { type: String, enum: ['USER', 'SYSTEM', 'AI'], default: 'USER' },
    entityType: { type: String, enum: ['APPLICATION', 'COMPANY'], required: true },
    entityId: { type: Schema.Types.ObjectId, required: true, index: true },
    type: {
      type: String,
      enum: [
        'CREATED',
        'UPDATED',
        'STATUS_CHANGED',
        'ARCHIVED',
        'RESTORED',
        'DELETED',
        'COMMENT_ADDED',
        'COMMENT_EDITED',
        'COMMENT_DELETED',
        'AI_AUTOFILLED',
        'IMPORTED',
      ],
      required: true,
    },
    changes: {
      type: [
        {
          field: { type: String, required: true },
          from: { type: Schema.Types.Mixed },
          to: { type: Schema.Types.Mixed },
          changed: { type: Boolean },
        },
      ],
      default: [],
    },
    summary: { type: String, required: true },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  },
);

activitySchema.index({ entityId: 1, createdAt: -1 });
activitySchema.index({ userId: 1, createdAt: -1 });
activitySchema.plugin(toJsonPlugin);

export const ActivityModel = model<ActivityDoc>('Activity', activitySchema);
