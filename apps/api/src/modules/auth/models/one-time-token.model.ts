import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export type OneTimeTokenPurpose = 'VERIFY_EMAIL' | 'RESET_PASSWORD';

export interface OneTimeTokenDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  purpose: OneTimeTokenPurpose;
  tokenHash: string; // SHA-256 of token
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const oneTimeTokenSchema = new Schema<OneTimeTokenDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    purpose: { type: String, enum: ['VERIFY_EMAIL', 'RESET_PASSWORD'], required: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    usedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

oneTimeTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL
oneTimeTokenSchema.plugin(toJsonPlugin);

export const OneTimeTokenModel = model<OneTimeTokenDoc>('OneTimeToken', oneTimeTokenSchema);
