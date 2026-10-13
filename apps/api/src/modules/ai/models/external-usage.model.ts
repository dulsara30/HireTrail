import { Schema, model, Document } from 'mongoose';

/** Credits used per month on an external service (for example Tavily search), shared by all users. */
export interface ExternalUsageDoc extends Document {
  provider: string;
  month: string;
  credits: number;
}

const externalUsageSchema = new Schema<ExternalUsageDoc>(
  {
    provider: { type: String, required: true },
    month: { type: String, required: true },
    credits: { type: Number, required: true, default: 0 },
  },
  { timestamps: true },
);

externalUsageSchema.index({ provider: 1, month: 1 }, { unique: true });

export const ExternalUsageModel = model<ExternalUsageDoc>('ExternalUsage', externalUsageSchema);
