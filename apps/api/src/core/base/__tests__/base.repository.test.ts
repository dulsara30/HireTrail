import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import mongoose, { Schema, model, Types } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { BaseRepository, type VersionedDocument } from '../base.repository';
import { ConflictError, NotFoundError } from '../../errors/domain-errors';

interface ItemDoc extends VersionedDocument {
  title: string;
}

const itemSchema = new Schema<ItemDoc>({
  title: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true, index: true },
  version: { type: Number, default: 1 },
  deletedAt: { type: Date, default: null },
});

const ItemModel = model<ItemDoc>('TestRepoItem', itemSchema);

class ItemRepository extends BaseRepository<ItemDoc> {
  constructor() {
    super(ItemModel);
  }
}

describe('BaseRepository', () => {
  let mongod: MongoMemoryServer;
  let repo: ItemRepository;
  const userA = new Types.ObjectId().toString();
  const userB = new Types.ObjectId().toString();

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    repo = new ItemRepository();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
  });

  it('scopes findOwnedById to the requesting user only', async () => {
    const item = await ItemModel.create({
      title: 'Confidential Application',
      userId: new Types.ObjectId(userA),
    });

    const foundByOwner = await repo.findOwnedById(userA, item.id);
    expect(foundByOwner).toBeDefined();
    expect(foundByOwner?.title).toBe('Confidential Application');

    // Other user cannot see the item
    const foundByOther = await repo.findOwnedById(userB, item.id);
    expect(foundByOther).toBeNull();
  });

  it('scopes listOwned by userId', async () => {
    await ItemModel.create({ title: 'User A Item', userId: new Types.ObjectId(userA) });
    await ItemModel.create({ title: 'User B Item', userId: new Types.ObjectId(userB) });

    const userAResult = await repo.listOwned(userA);
    expect(userAResult.items.every((i) => i.userId?.toString() === userA)).toBe(true);
  });

  it('updates with version increment and throws ConflictError on version mismatch', async () => {
    const item = await ItemModel.create({
      title: 'V1 Title',
      userId: new Types.ObjectId(userA),
      version: 1,
    });

    const updated = await repo.updateOwnedWithVersion(userA, item.id, 1, {
      $set: { title: 'V2 Title' },
    });
    expect(updated.title).toBe('V2 Title');
    expect(updated.version).toBe(2);

    // Stale version update should throw ConflictError
    await expect(
      repo.updateOwnedWithVersion(userA, item.id, 1, { $set: { title: 'Conflict' } }),
    ).rejects.toThrow(ConflictError);
  });

  it('throws NotFoundError when updating non-existent item or other user item', async () => {
    const nonExistentId = new Types.ObjectId().toString();
    await expect(
      repo.updateOwnedWithVersion(userA, nonExistentId, 1, { $set: { title: 'Fail' } }),
    ).rejects.toThrow(NotFoundError);
  });

  it('soft deletes owned item', async () => {
    const item = await ItemModel.create({
      title: 'To Delete',
      userId: new Types.ObjectId(userA),
    });

    const deleted = await repo.softDeleteOwned(userA, item.id);
    expect(deleted).toBe(true);

    const check = await ItemModel.findById(item.id);
    expect(check?.deletedAt).toBeInstanceOf(Date);
  });
});
