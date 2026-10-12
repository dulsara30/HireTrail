import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface UserCompanyNotesDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  myRating: number | null;
  notesHtml: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const userCompanyNotesSchema = new Schema<UserCompanyNotesDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true, index: true },
    myRating: { type: Number, min: 1, max: 5, default: null },
    notesHtml: { type: String, maxlength: 10000, default: null },
  },
  {
    timestamps: true,
  },
);

userCompanyNotesSchema.index({ userId: 1, companyId: 1 }, { unique: true });
userCompanyNotesSchema.plugin(toJsonPlugin);

export const UserCompanyNotesModel = model<UserCompanyNotesDoc>(
  'UserCompanyNotes',
  userCompanyNotesSchema,
);
