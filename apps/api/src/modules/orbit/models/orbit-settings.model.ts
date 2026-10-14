import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface OrbitSettingsDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  timezone: string;
  emailDigest: boolean;
  emailReminders: boolean;
  digestHour: number;
  /** The local date (YYYY-MM-DD) the last digest was sent for. */
  lastDigestDate: string | null;
  weeklyGoal: number;
  createdAt: Date;
  updatedAt: Date;
}

const orbitSettingsSchema = new Schema<OrbitSettingsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    timezone: { type: String, default: 'UTC', maxlength: 64 },
    emailDigest: { type: Boolean, default: true },
    emailReminders: { type: Boolean, default: true },
    digestHour: { type: Number, default: 8, min: 0, max: 23 },
    lastDigestDate: { type: String, default: null },
    weeklyGoal: { type: Number, default: 5, min: 1, max: 100 },
  },
  { timestamps: true },
);

orbitSettingsSchema.plugin(toJsonPlugin);

export const OrbitSettingsModel = model<OrbitSettingsDoc>('OrbitSettings', orbitSettingsSchema);
