import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Schema, model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { softDeletePlugin } from '../soft-delete.plugin';
import { toJsonPlugin } from '../to-json.plugin';

describe('Mongoose Plugins', () => {
  let mongod: MongoMemoryServer;

  interface TestDoc {
    name: string;
    deletedAt?: Date | null;
  }

  const testSchema = new Schema<TestDoc>({
    name: { type: String, required: true },
  });

  testSchema.plugin(softDeletePlugin);
  testSchema.plugin(toJsonPlugin);

  const TestModel = model<TestDoc>('TestPluginModel', testSchema);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  describe('softDeletePlugin', () => {
    it('automatically excludes soft-deleted records from find queries', async () => {
      const active = await TestModel.create({ name: 'Active item' });
      const deleted = await TestModel.create({
        name: 'Deleted item',
        deletedAt: new Date(),
      });

      const found = await TestModel.find({});
      expect(found.some((d) => d.id === active.id)).toBe(true);
      expect(found.some((d) => d.id === deleted.id)).toBe(false);

      // Verify withDeleted: true retrieves soft-deleted documents
      const all = await TestModel.find({}).setOptions({ withDeleted: true });
      expect(all.some((d) => d.id === deleted.id)).toBe(true);
    });

    it('safely merges deletedAt: null into first $match stage in aggregate', async () => {
      const aggregate = TestModel.aggregate([{ $match: { name: 'Active item' } }]);
      await aggregate.exec();
      const pipeline = aggregate.pipeline() as unknown as Array<{
        $match: Record<string, unknown>;
      }>;

      expect(pipeline[0]?.$match.deletedAt).toBeNull();
      expect(pipeline[0]?.$match.name).toBe('Active item');
    });

    it('preserves $geoNear strictly at index 0 in aggregate', async () => {
      const aggregate = TestModel.aggregate([
        { $geoNear: { near: [0, 0], distanceField: 'dist' } },
        { $sort: { dist: 1 } },
      ]);
      // Run the pre-hooks without sending invalid $geoNear to mongod
      // Mongoose Aggregate inherits from EventEmitter and runs hooks on exec()
      try {
        await aggregate.exec();
      } catch {
        // mongod might fail execution due to missing 2dsphere index, but pre-aggregate hooks already executed
      }
      const pipeline = aggregate.pipeline() as unknown as Array<Record<string, unknown>>;

      expect(pipeline[0]?.$geoNear).toBeDefined();
      expect(pipeline[1]?.$match).toEqual({ deletedAt: null });
    });

    it('prepends $match when first stage is not $match or $geoNear', async () => {
      const aggregate = TestModel.aggregate([{ $sort: { name: 1 } }]);
      await aggregate.exec();
      const pipeline = aggregate.pipeline() as unknown as Array<Record<string, unknown>>;

      expect(pipeline[0]?.$match).toEqual({ deletedAt: null });
      expect(pipeline[1]?.$sort).toEqual({ name: 1 });
    });
  });

  describe('toJsonPlugin', () => {
    it('transforms _id to id and strips _id and __v', async () => {
      const doc = await TestModel.create({ name: 'JSON item' });
      const json = doc.toJSON() as Record<string, unknown>;

      expect(json.id).toBe(doc._id.toString());
      expect(json._id).toBeUndefined();
      expect(json.__v).toBeUndefined();
    });
  });
});
