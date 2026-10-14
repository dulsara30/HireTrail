import { Schema, model, Document, Types } from 'mongoose';
import { ORBIT_WIDGET_TYPES, type OrbitWidgetType } from '@hiretrail/shared';
import { toJsonPlugin } from '../../../core/db/plugins/to-json.plugin';

export interface OrbitWidgetDoc {
  id: string;
  type: OrbitWidgetType;
  x: number;
  y: number;
  w: number;
  h: number;
  config: Record<string, unknown>;
}

export interface OrbitSpaceDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  name: string;
  order: number;
  widgets: OrbitWidgetDoc[];
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

const widgetSchema = new Schema<OrbitWidgetDoc>(
  {
    id: { type: String, required: true },
    type: { type: String, enum: ORBIT_WIDGET_TYPES, required: true },
    x: { type: Number, required: true },
    y: { type: Number, required: true },
    w: { type: Number, required: true },
    h: { type: Number, required: true },
    config: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false },
);

const orbitSpaceSchema = new Schema<OrbitSpaceDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    name: { type: String, required: true, trim: true, maxlength: 40 },
    order: { type: Number, default: 0 },
    widgets: { type: [widgetSchema], default: [] },
  },
  { timestamps: true, versionKey: 'version' },
);

orbitSpaceSchema.index({ userId: 1, order: 1 });
orbitSpaceSchema.plugin(toJsonPlugin);

export const OrbitSpaceModel = model<OrbitSpaceDoc>('OrbitSpace', orbitSpaceSchema);
