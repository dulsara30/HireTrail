import { Schema, model, Document, Types } from 'mongoose';

export interface ImportDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  fileName: string;
  headers: string[];
  rows: Array<Record<string, string>>;
  status: 'PREVIEWED' | 'COMMITTED';
  expiresAt: Date;
  createdAt: Date;
}

const importSchema = new Schema<ImportDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fileName: { type: String, default: 'import.csv', maxlength: 200 },
    headers: { type: [String], default: [] },
    rows: { type: [Object], default: [] },
    status: { type: String, enum: ['PREVIEWED', 'COMMITTED'], default: 'PREVIEWED' },
    expiresAt: { type: Date, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

// TTL: staged rows disappear 1 hour after the preview
importSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const ImportModel = model<ImportDoc>('Import', importSchema);
