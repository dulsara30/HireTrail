import { Schema, model, Document, Types } from 'mongoose';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';
import { StatusCategory, ClosedReason } from '@hiretrail/shared';

export interface ApplicationContact {
  name: string;
  role?: string;
  email?: string;
  phone?: string;
  linkedinUrl?: string;
}

export interface ApplicationSalary {
  min?: number;
  max?: number;
  currency?: string;
  period?: 'HOUR' | 'MONTH' | 'YEAR';
  expected?: number;
}

export interface ApplicationDates {
  savedAt?: Date;
  appliedAt?: Date;
  deadlineAt?: Date;
  followUpAt?: Date;
  nextInterviewAt?: Date;
}

export interface ApplicationMilestones {
  appliedAt?: Date;
  firstResponseAt?: Date;
  firstInterviewAt?: Date;
  offerAt?: Date;
  acceptedAt?: Date;
  closedAt?: Date;
  closedReason?: ClosedReason;
}

export interface ApplicationAi {
  aiUsageId?: Types.ObjectId;
  aiFilledFields?: string[];
}

export interface ApplicationDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  companyId: Types.ObjectId | null;
  companyName: string;
  roleTitle: string;
  statusId: Types.ObjectId;
  statusCategory: StatusCategory;
  boardOrder: string;
  priorityId: Types.ObjectId | null;
  workModeId: Types.ObjectId | null;
  jobTypeId: Types.ObjectId | null;
  levelId: Types.ObjectId | null;
  sourceId: Types.ObjectId | null;
  cvVersionId: Types.ObjectId | null;
  labelIds: Types.ObjectId[];
  location?: string;
  coverLetter: boolean;
  jobUrl?: string;
  jobDescription?: {
    html?: string;
    text?: string;
  };
  salary?: ApplicationSalary;
  dates?: ApplicationDates;
  milestones?: ApplicationMilestones;
  contacts: ApplicationContact[];
  notesHtml?: string;
  ai?: ApplicationAi;
  lastActivityAt: Date;
  archivedAt: Date | null;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const applicationSchema = new Schema<ApplicationDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    companyName: { type: String, required: true, trim: true, maxlength: 120 },
    roleTitle: { type: String, required: true, trim: true, maxlength: 120 },
    statusId: { type: Schema.Types.ObjectId, ref: 'Option', required: true },
    statusCategory: { type: String, enum: Object.values(StatusCategory), required: true },
    boardOrder: { type: String, required: true },
    priorityId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    workModeId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    jobTypeId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    levelId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    sourceId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    cvVersionId: { type: Schema.Types.ObjectId, ref: 'Option', default: null },
    labelIds: { type: [{ type: Schema.Types.ObjectId, ref: 'Option' }], default: [] },
    location: { type: String, trim: true, maxlength: 120 },
    coverLetter: { type: Boolean, default: false },
    jobUrl: { type: String, trim: true },
    jobDescription: {
      html: { type: String },
      text: { type: String },
    },
    salary: {
      min: { type: Number },
      max: { type: Number },
      currency: { type: String },
      period: { type: String, enum: ['HOUR', 'MONTH', 'YEAR'] },
      expected: { type: Number },
    },
    dates: {
      savedAt: { type: Date },
      appliedAt: { type: Date },
      deadlineAt: { type: Date },
      followUpAt: { type: Date },
      nextInterviewAt: { type: Date },
    },
    milestones: {
      appliedAt: { type: Date },
      firstResponseAt: { type: Date },
      firstInterviewAt: { type: Date },
      offerAt: { type: Date },
      acceptedAt: { type: Date },
      closedAt: { type: Date },
      closedReason: { type: String, enum: Object.values(ClosedReason) },
    },
    contacts: {
      type: [
        {
          name: { type: String, required: true },
          role: { type: String },
          email: { type: String },
          phone: { type: String },
          linkedinUrl: { type: String },
        },
      ],
      default: [],
    },
    notesHtml: { type: String },
    ai: {
      aiUsageId: { type: Schema.Types.ObjectId },
      aiFilledFields: { type: [String], default: [] },
    },
    lastActivityAt: { type: Date, default: Date.now, index: true },
    archivedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    versionKey: 'version',
  },
);

applicationSchema.index({ userId: 1, statusId: 1, boardOrder: 1 });
applicationSchema.index({ userId: 1, updatedAt: -1 });
applicationSchema.index({ userId: 1, 'dates.followUpAt': 1 });
applicationSchema.index({ userId: 1, 'milestones.appliedAt': -1 });
applicationSchema.index({ userId: 1, companyId: 1 });
applicationSchema.index({ roleTitle: 'text', companyName: 'text' });
applicationSchema.plugin(toJsonPlugin);

export const ApplicationModel = model<ApplicationDoc>('Application', applicationSchema);
