import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export type RevokeReason =
  'LOGOUT' | 'LOGOUT_ALL' | 'REUSE_DETECTED' | 'PASSWORD_CHANGED' | 'SUSPENDED' | 'ADMIN';

export interface SessionDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  familyId: string;
  tokenHash: string; // SHA-256 of active refresh token
  previousTokenHash?: string; // SHA-256 of immediately previous token (for grace period & reuse detection)
  expiresAt: Date;
  rotatedAt: Date | null;
  revokedAt: Date | null;
  revokedReason?: RevokeReason;
  userAgent?: string;
  ipHash?: string;
  lastUsedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const sessionSchema = new Schema<SessionDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    familyId: { type: String, required: true, index: true },
    tokenHash: { type: String, required: true, unique: true },
    previousTokenHash: { type: String, index: true },
    expiresAt: { type: Date, required: true },
    rotatedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    revokedReason: {
      type: String,
      enum: ['LOGOUT', 'LOGOUT_ALL', 'REUSE_DETECTED', 'PASSWORD_CHANGED', 'SUSPENDED', 'ADMIN'],
    },
    userAgent: { type: String },
    ipHash: { type: String },
    lastUsedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
  },
);

sessionSchema.index({ userId: 1, revokedAt: 1 });
sessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // MongoDB TTL
sessionSchema.plugin(toJsonPlugin);

export const SessionModel = model<SessionDoc>('Session', sessionSchema);
