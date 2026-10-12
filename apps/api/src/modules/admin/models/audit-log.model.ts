import { Schema, model, Document, Types } from 'mongoose';

export const AUDIT_ACTIONS = [
  'USER_PLAN_CHANGED',
  'USER_SUSPENDED',
  'USER_REACTIVATED',
  'COMPANY_CREATED',
  'COMPANY_UPDATED',
  'COMPANY_MERGED',
  'COMPANIES_IMPORTED',
  'VERIFICATION_APPLIED',
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export interface AuditLogDoc extends Document {
  _id: Types.ObjectId;
  actorId: Types.ObjectId | null;
  actorType: 'USER' | 'SYSTEM';
  action: AuditAction;
  targetType: string;
  targetId: Types.ObjectId | null;
  before: unknown;
  after: unknown;
  reason: string | null;
  ipHash: string | null;
  createdAt: Date;
}

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    actorType: { type: String, enum: ['USER', 'SYSTEM'], required: true },
    action: { type: String, enum: AUDIT_ACTIONS, required: true },
    targetType: { type: String, required: true },
    targetId: { type: Schema.Types.ObjectId, default: null },
    before: { type: Schema.Types.Mixed, default: null },
    after: { type: Schema.Types.Mixed, default: null },
    reason: { type: String, default: null },
    ipHash: { type: String, default: null },
    createdAt: { type: Date, default: Date.now, immutable: true },
  },
  { timestamps: false, versionKey: false },
);

auditLogSchema.index({ createdAt: -1 });
auditLogSchema.index({ targetId: 1 });

export const AuditLogModel = model<AuditLogDoc>('AuditLog', auditLogSchema);
