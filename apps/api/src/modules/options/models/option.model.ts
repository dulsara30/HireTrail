import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface OptionDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  type: string;
  key: string;
  label: string;
  color: string;
  order: string;
  isDefault: boolean;
  archivedAt: Date | null;
  meta?: Record<string, unknown>;
  aliases: string[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const optionSchema = new Schema<OptionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: {
      type: String,
      enum: [
        'STATUS',
        'PRIORITY',
        'LABEL',
        'WORK_MODE',
        'JOB_TYPE',
        'LEVEL',
        'SOURCE',
        'CV_VERSION',
      ],
      required: true,
    },
    key: { type: String, required: true },
    label: { type: String, required: true, maxlength: 40 },
    color: { type: String, required: true },
    order: { type: String, required: true },
    isDefault: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    meta: { type: Schema.Types.Mixed, default: {} },
    aliases: { type: [String], default: [] },
  },
  {
    timestamps: true,
    versionKey: 'version',
  },
);

optionSchema.index({ userId: 1, type: 1, key: 1 }, { unique: true });
optionSchema.index({ userId: 1, type: 1, order: 1 });
optionSchema.plugin(toJsonPlugin);

export const OptionModel = model<OptionDoc>('Option', optionSchema);
