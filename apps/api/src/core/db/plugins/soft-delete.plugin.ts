import { type Schema, type Query, type Aggregate } from 'mongoose';

export interface SoftDeleteOptions {
  withDeleted?: boolean;
}

export function softDeletePlugin(schema: Schema): void {
  // Add deletedAt path if not present
  if (!schema.path('deletedAt')) {
    schema.add({
      deletedAt: {
        type: Date,
        default: null,
        index: true,
      },
    });
  }

  // Pre-query hooks
  schema.pre('find', function (this: Query<unknown, unknown>) {
    if (!(this.getOptions() as SoftDeleteOptions)?.withDeleted) {
      this.where({ deletedAt: null });
    }
  });

  schema.pre('findOne', function (this: Query<unknown, unknown>) {
    if (!(this.getOptions() as SoftDeleteOptions)?.withDeleted) {
      this.where({ deletedAt: null });
    }
  });

  schema.pre('findOneAndUpdate', function (this: Query<unknown, unknown>) {
    if (!(this.getOptions() as SoftDeleteOptions)?.withDeleted) {
      this.where({ deletedAt: null });
    }
  });

  schema.pre('countDocuments', function (this: Query<unknown, unknown>) {
    if (!(this.getOptions() as SoftDeleteOptions)?.withDeleted) {
      this.where({ deletedAt: null });
    }
  });

  // Pre-aggregate hook safely handling $text and $geoNear
  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    const options = (this.options || {}) as SoftDeleteOptions;
    if (options?.withDeleted) {
      return;
    }

    const pipeline = this.pipeline();
    if (pipeline.length === 0) {
      pipeline.unshift({ $match: { deletedAt: null } });
      return;
    }

    const firstStage = pipeline[0] as unknown as Record<string, unknown> | undefined;

    // Case 1: $geoNear must remain strictly the first stage in MongoDB
    if (firstStage && '$geoNear' in firstStage) {
      const nextStage = pipeline[1] as unknown as Record<string, unknown> | undefined;
      if (nextStage && '$match' in nextStage) {
        const secondMatch = nextStage.$match as Record<string, unknown>;
        secondMatch.deletedAt = null;
      } else {
        pipeline.splice(1, 0, { $match: { deletedAt: null } });
      }
      return;
    }

    // Case 2: first stage is already $match (e.g. containing $text or other filters)
    if (firstStage && '$match' in firstStage) {
      const firstMatch = firstStage.$match as Record<string, unknown>;
      firstMatch.deletedAt = null;
      return;
    }

    // Case 3: first stage is neither $geoNear nor $match
    pipeline.unshift({ $match: { deletedAt: null } });
  });
}
