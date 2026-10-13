import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

/** One private note a user wrote about a company. A user can keep many, written at different times. */
export interface CompanyNoteDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyId: Types.ObjectId;
  bodyHtml: string;
  editedAt: Date | null;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const companyNoteSchema = new Schema<CompanyNoteDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    bodyHtml: { type: String, required: true, maxlength: 20000 },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: 'version',
  },
);

companyNoteSchema.index({ userId: 1, companyId: 1, createdAt: -1 });
companyNoteSchema.plugin(toJsonPlugin);

export const CompanyNoteModel = model<CompanyNoteDoc>('CompanyNote', companyNoteSchema);
