import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface UserPreferences {
  timezone: string;
  currency: string;
  collapsedLanes: string[];
  panelWidth?: number;
}

export interface UserSecurity {
  passwordChangedAt?: Date;
}

export interface GoogleProfile {
  sub: string;
  email: string;
  linkedAt: Date;
}

export interface UserDoc extends Document {
  _id: Types.ObjectId;
  email: string;
  passwordHash: string | null;
  google: GoogleProfile | null;
  name: string;
  avatarUrl: string | null;
  role: 'USER' | 'ADMIN';
  plan: 'FREE' | 'PRO';
  planMeta?: {
    source: 'MANUAL' | 'STRIPE';
    updatedAt: Date;
    updatedBy?: string;
    reason?: string;
  };
  status: 'ACTIVE' | 'SUSPENDED';
  emailVerifiedAt: Date | null;
  security: UserSecurity;
  preferences: UserPreferences;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<UserDoc>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, default: null },
    google: {
      type: {
        sub: { type: String, required: true },
        email: { type: String, required: true },
        linkedAt: { type: Date, default: Date.now },
      },
      default: null,
    },
    name: { type: String, required: true, trim: true, maxlength: 80 },
    avatarUrl: { type: String, default: null },
    role: { type: String, enum: ['USER', 'ADMIN'], default: 'USER', index: true },
    plan: { type: String, enum: ['FREE', 'PRO'], default: 'FREE', index: true },
    planMeta: {
      source: { type: String, enum: ['MANUAL', 'STRIPE'] },
      updatedAt: { type: Date },
      updatedBy: { type: String },
      reason: { type: String },
    },
    status: { type: String, enum: ['ACTIVE', 'SUSPENDED'], default: 'ACTIVE' },
    emailVerifiedAt: { type: Date, default: null },
    security: {
      passwordChangedAt: { type: Date },
    },
    preferences: {
      timezone: { type: String, default: 'Asia/Colombo' },
      currency: { type: String, default: 'LKR' },
      collapsedLanes: { type: [String], default: [] },
      panelWidth: { type: Number },
    },
    lastLoginAt: { type: Date },
  },
  {
    timestamps: true,
  },
);

userSchema.index({ 'google.sub': 1 }, { unique: true, sparse: true });
userSchema.plugin(toJsonPlugin);

export const UserModel = model<UserDoc>('User', userSchema);
