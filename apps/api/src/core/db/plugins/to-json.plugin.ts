import { type Schema } from 'mongoose';

export function toJsonPlugin(schema: Schema): void {
  const existingTransform = schema.get('toJSON')?.transform;

  schema.set('toJSON', {
    virtuals: true,
    transform(doc: unknown, ret: Record<string, unknown>, options: unknown) {
      // Map _id to id
      if (ret._id && typeof (ret._id as { toString?: () => string }).toString === 'function') {
        ret.id = (ret._id as { toString: () => string }).toString();
      }
      delete ret._id;
      delete ret.__v;

      if (typeof existingTransform === 'function') {
        return (existingTransform as (d: unknown, r: unknown, o: unknown) => unknown)(
          doc,
          ret,
          options,
        );
      }
      return ret;
    },
  });
}
