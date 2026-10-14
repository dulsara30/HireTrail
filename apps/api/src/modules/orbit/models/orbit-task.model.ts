import { Schema, model, Document, Types } from 'mongoose';
import {
  ORBIT_KINDS,
  ORBIT_PRIORITIES,
  ORBIT_RECURRENCE_FREQS,
  ORBIT_STATUSES,
  type OrbitKind,
  type OrbitPriority,
  type OrbitRecurrenceFreq,
  type OrbitStatus,
} from '@hiretrail/shared';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

/** Items without a date sort after every dated item. */
export const NO_DATE_SORT = new Date('9999-12-31T00:00:00.000Z');

export interface OrbitChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface OrbitTaskDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  title: string;
  notesHtml: string | null;
  kind: OrbitKind;
  status: OrbitStatus;
  priority: OrbitPriority;
  dueAt: Date | null;
  /** dueAt, or a far future date when there is none. Makes "sort by due date" a plain index sort. */
  sortAt: Date;
  allDay: boolean;
  remindAt: Date | null;
  applicationId: Types.ObjectId | null;
  companyId: Types.ObjectId | null;
  tags: string[];
  checklist: OrbitChecklistItem[];
  recurrence: { freq: OrbitRecurrenceFreq; interval: number } | null;
  watchUrl: string | null;
  completedAt: Date | null;
  snoozedUntil: Date | null;
  /** When the reminder email was sent, so it is sent once. */
  notifiedAt: Date | null;
  deletedAt: Date | null;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const checklistItemSchema = new Schema<OrbitChecklistItem>(
  {
    id: { type: String, required: true },
    text: { type: String, required: true, maxlength: 200 },
    done: { type: Boolean, default: false },
  },
  { _id: false },
);

const recurrenceSchema = new Schema(
  {
    freq: { type: String, enum: ORBIT_RECURRENCE_FREQS, required: true },
    interval: { type: Number, min: 1, max: 12, default: 1 },
  },
  { _id: false },
);

const orbitTaskSchema = new Schema<OrbitTaskDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    title: { type: String, required: true, trim: true, maxlength: 200 },
    notesHtml: { type: String, default: null, maxlength: 20000 },
    kind: { type: String, enum: ORBIT_KINDS, default: 'TASK' },
    status: { type: String, enum: ORBIT_STATUSES, default: 'OPEN' },
    priority: { type: String, enum: ORBIT_PRIORITIES, default: 'MEDIUM' },
    dueAt: { type: Date, default: null },
    sortAt: { type: Date, required: true, default: NO_DATE_SORT },
    allDay: { type: Boolean, default: false },
    remindAt: { type: Date, default: null },
    applicationId: { type: Schema.Types.ObjectId, ref: 'Application', default: null },
    companyId: { type: Schema.Types.ObjectId, ref: 'Company', default: null },
    tags: { type: [String], default: [] },
    checklist: { type: [checklistItemSchema], default: [] },
    recurrence: { type: recurrenceSchema, default: null },
    watchUrl: { type: String, default: null, maxlength: 2048 },
    completedAt: { type: Date, default: null },
    snoozedUntil: { type: Date, default: null },
    notifiedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: 'version' },
);

orbitTaskSchema.index({ userId: 1, status: 1, sortAt: 1, _id: 1 });
orbitTaskSchema.index({ userId: 1, applicationId: 1 });
orbitTaskSchema.index({ userId: 1, companyId: 1 });
orbitTaskSchema.index({ status: 1, remindAt: 1, notifiedAt: 1 });
orbitTaskSchema.plugin(toJsonPlugin);

export const OrbitTaskModel = model<OrbitTaskDoc>('OrbitTask', orbitTaskSchema);
