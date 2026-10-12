import { ClientSession, Types } from 'mongoose';
import { DEFAULT_OPTIONS } from '@hiretrail/shared';
import { OptionModel } from '../../options/models/option.model';

export class OptionSeedService {
  async seedDefaultsForUser(
    userId: Types.ObjectId | string,
    session?: ClientSession,
  ): Promise<void> {
    const documents = DEFAULT_OPTIONS.map((opt) => ({
      userId,
      type: opt.type,
      key: opt.key,
      label: opt.label,
      color: opt.color,
      order: opt.order,
      isDefault: true,
      archivedAt: null,
      meta: opt.meta ?? {},
      aliases: opt.aliases ?? [],
      version: 0,
    }));

    await OptionModel.insertMany(documents, { session });
  }
}
