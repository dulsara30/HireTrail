import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface CompanyDoc extends Document {
  _id: Types.ObjectId;
  ownerId: Types.ObjectId | null;
  name: string;
  normalizedName: string;
  slug: string;
  aliases: string[];
  region?: 'LOCAL' | 'FOREIGN';
  country?: string;
  city?: string;
  website?: string;
  careersUrl?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  foundedYear?: string;
  size?: string;
  industry?: string;
  techStack: string[];
  description?: string;
  hiringModel?: string;
  tier?: 'A' | 'B' | null;
  source: {
    type: 'SEED' | 'USER' | 'AI_LOOKUP' | 'ADMIN';
    ref?: string;
    importedAt?: Date;
  };
  conflicts?: Record<string, unknown>;
  verification?: {
    status: 'UNVERIFIED' | 'VERIFIED' | 'FAILED';
    score?: number;
    checkedAt?: Date;
    lastVerificationId?: Types.ObjectId;
  };
  createdBy?: Types.ObjectId | null;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const companySchema = new Schema<CompanyDoc>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    normalizedName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true },
    aliases: { type: [String], default: [] },
    region: { type: String, enum: ['LOCAL', 'FOREIGN'] },
    country: { type: String },
    city: { type: String },
    website: { type: String },
    careersUrl: { type: String },
    linkedinUrl: { type: String },
    contactEmail: { type: String },
    foundedYear: { type: String },
    size: { type: String },
    industry: { type: String },
    techStack: { type: [String], default: [] },
    description: { type: String, maxlength: 2000 },
    hiringModel: { type: String },
    tier: { type: String, enum: ['A', 'B', null], default: null },
    source: {
      type: {
        type: String,
        enum: ['SEED', 'USER', 'AI_LOOKUP', 'ADMIN'],
        default: 'USER',
      },
      ref: { type: String },
      importedAt: { type: Date },
    },
    conflicts: { type: Schema.Types.Mixed, default: {} },
    verification: {
      status: {
        type: String,
        enum: ['UNVERIFIED', 'VERIFIED', 'FAILED'],
        default: 'UNVERIFIED',
      },
      score: { type: Number },
      checkedAt: { type: Date },
      lastVerificationId: { type: Schema.Types.ObjectId },
    },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    versionKey: 'version',
  },
);

companySchema.index({ ownerId: 1, normalizedName: 1 }, { unique: true });
companySchema.index({ ownerId: 1, slug: 1 }, { unique: true });
companySchema.index({ name: 'text', aliases: 'text' });
companySchema.index({ region: 1, tier: 1 });
companySchema.plugin(toJsonPlugin);

export const CompanyModel = model<CompanyDoc>('Company', companySchema);
