import { Schema, model, Document, Types } from 'mongoose';

export interface AiInsightsDoc extends Document {
  _id: Types.ObjectId;
  userId: Types.ObjectId;
  isoWeek: string;
  insights: Array<{ title: string; detail: string; basedOn: string[] }>;
  modelId: string;
  createdAt: Date;
  refreshedAt: Date;
}

const aiInsightsSchema = new Schema<AiInsightsDoc>(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    isoWeek: { type: String, required: true },
    insights: {
      type: [
        { _id: false, title: String, detail: String, basedOn: { type: [String], default: [] } },
      ],
      default: [],
    },
    modelId: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now },
    refreshedAt: { type: Date, default: Date.now },
  },
  { timestamps: false, versionKey: false },
);

aiInsightsSchema.index({ userId: 1, isoWeek: 1 }, { unique: true });

export const AiInsightsModel = model<AiInsightsDoc>('AiInsights', aiInsightsSchema);
