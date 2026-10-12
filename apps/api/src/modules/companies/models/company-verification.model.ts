import { Schema, model, Document, Types } from 'mongoose';
import { type VerifiableField, type VerificationVerdict } from '@hiretrail/shared';

export interface VerificationFieldDoc {
  field: VerifiableField;
  storedValue: string | null;
  foundValue: string | null;
  verdict: VerificationVerdict;
  sources: Array<{ url: string; title?: string }>;
}

export interface CompanyVerificationDoc extends Document {
  _id: Types.ObjectId;
  companyId: Types.ObjectId;
  requestedBy: Types.ObjectId;
  modelId: string;
  fields: VerificationFieldDoc[];
  companyExists: 'YES' | 'NO' | 'UNSURE';
  score: number;
  suggestions: Array<{ field: VerifiableField; value: string; sourceUrl: string }>;
  searchCheckAvailable: boolean;
  createdAt: Date;
}

const verificationSchema = new Schema<CompanyVerificationDoc>(
  {
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', required: true },
    requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    modelId: { type: String, default: '' },
    fields: {
      type: [
        {
          _id: false,
          field: { type: String, required: true },
          storedValue: { type: String, default: null },
          foundValue: { type: String, default: null },
          verdict: { type: String, enum: ['MATCH', 'DIFFERENT', 'NOT_FOUND'], required: true },
          sources: { type: [{ _id: false, url: String, title: String }], default: [] },
        },
      ],
      default: [],
    },
    companyExists: { type: String, enum: ['YES', 'NO', 'UNSURE'], required: true },
    score: { type: Number, required: true, min: 0, max: 100 },
    suggestions: {
      type: [{ _id: false, field: String, value: String, sourceUrl: String }],
      default: [],
    },
    searchCheckAvailable: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

verificationSchema.index({ companyId: 1, createdAt: -1 });

export const CompanyVerificationModel = model<CompanyVerificationDoc>(
  'CompanyVerification',
  verificationSchema,
);
