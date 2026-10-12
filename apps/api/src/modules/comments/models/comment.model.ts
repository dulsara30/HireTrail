import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface CommentDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  applicationId: Types.ObjectId;
  kind: 'NOTE' | 'FOLLOW_UP' | 'INTERVIEW';
  bodyHtml: string;
  dueAt: Date | null;
  doneAt: Date | null;
  editedAt: Date | null;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const commentSchema = new Schema<CommentDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', required: true, index: true },
    kind: { type: String, enum: ['NOTE', 'FOLLOW_UP', 'INTERVIEW'], required: true },
    bodyHtml: { type: String, required: true },
    dueAt: { type: Date, default: null },
    doneAt: { type: Date, default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: 'version',
  },
);

commentSchema.index({ applicationId: 1, createdAt: -1 });
commentSchema.index({ userId: 1, kind: 1, doneAt: 1, dueAt: 1 });
commentSchema.plugin(toJsonPlugin);

export const CommentModel = model<CommentDoc>('Comment', commentSchema);
