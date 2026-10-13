import { Schema, model, Document } from 'mongoose';

/** One row per provider that is currently skipped. The row deletes itself when the cooldown ends. */
export interface ProviderHealthDoc extends Document {
  key: string;
  openUntil: Date;
  reason: string;
  trips: number;
}

const providerHealthSchema = new Schema<ProviderHealthDoc>(
  {
    key: { type: String, required: true, unique: true },
    openUntil: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
    reason: { type: String, required: true, maxlength: 200 },
    trips: { type: Number, default: 1 },
  },
  { timestamps: true },
);

export const ProviderHealthModel = model<ProviderHealthDoc>('ProviderHealth', providerHealthSchema);
