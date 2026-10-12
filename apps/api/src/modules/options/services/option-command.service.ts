import { Types } from 'mongoose';
import {
  CreateOptionInput,
  UpdateOptionInput,
  MoveOptionInput,
  ArchiveOptionInput,
  ResetDefaultOptionsInput,
  OptionDto,
  DEFAULT_OPTIONS,
} from '@hiretrail/shared';
import { OptionRepository } from '../repositories/option.repository';
import { OptionMapper } from '../mappers/option.mapper';
import { FractionalOrder } from '../../../core/value-objects/fractional-order';
import { NotFoundError, OptionInUseError } from '../../../core/errors/domain-errors';
import { withTransaction } from '../../../core/db/transaction';
import { ApplicationModel } from '../../applications/models/application.model';

export class OptionCommandService {
  constructor(private readonly optionRepository: OptionRepository) {}

  public async create(userId: string, input: CreateOptionInput): Promise<OptionDto> {
    const last = await this.optionRepository.findLastInType(userId, input.type);
    const order = FractionalOrder.between(last?.order, null);
    const key =
      input.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'opt';

    const existingKey = await this.optionRepository.findByKey(userId, input.type, key);
    const finalKey = existingKey ? `${key}-${Date.now().toString(36)}` : key;

    const doc = await this.optionRepository.createOption({
      userId: new Types.ObjectId(userId),
      type: input.type,
      key: finalKey,
      label: input.label,
      color: input.color,
      order,
      meta: input.meta || {},
      aliases: (input.aliases || []).filter((a): a is string => Boolean(a)),
      isDefault: false,
    });

    return OptionMapper.toDto(doc);
  }

  public async update(userId: string, id: string, input: UpdateOptionInput): Promise<OptionDto> {
    const changes: Record<string, unknown> = {};
    if (input.label !== undefined) changes.label = input.label;
    if (input.color !== undefined) changes.color = input.color;
    if (input.meta !== undefined) changes.meta = input.meta;
    if (input.aliases !== undefined)
      changes.aliases = input.aliases.filter((a): a is string => Boolean(a));

    const updated = await this.optionRepository.updateOwnedWithVersion(userId, id, input.version, {
      $set: changes,
    });

    return OptionMapper.toDto(updated);
  }

  public async move(userId: string, id: string, input: MoveOptionInput): Promise<OptionDto> {
    const option = await this.optionRepository.findOwnedById(userId, id);
    if (!option) {
      throw new NotFoundError();
    }

    let beforeOrder: string | null = null;
    let afterOrder: string | null = null;

    if (input.beforeId) {
      const beforeOption = await this.optionRepository.findOwnedById(userId, input.beforeId);
      if (beforeOption) beforeOrder = beforeOption.order;
    }
    if (input.afterId) {
      const afterOption = await this.optionRepository.findOwnedById(userId, input.afterId);
      if (afterOption) afterOrder = afterOption.order;
    }

    const newOrder = FractionalOrder.between(beforeOrder, afterOrder);
    option.order = newOrder;
    await option.save();

    return OptionMapper.toDto(option);
  }

  public async archive(userId: string, id: string, input: ArchiveOptionInput): Promise<OptionDto> {
    const option = await this.optionRepository.findOwnedById(userId, id);
    if (!option) {
      throw new NotFoundError();
    }

    const inUseCount = await this.optionRepository.countInUse(userId, id);
    if (inUseCount > 0 && !input.reassignToId) {
      throw new OptionInUseError('Option is currently in use and requires reassignment', {
        inUseCount,
      });
    }

    if (inUseCount > 0 && input.reassignToId) {
      const targetOption = await this.optionRepository.findOwnedById(userId, input.reassignToId);
      if (!targetOption || targetOption.type !== option.type) {
        throw new NotFoundError(undefined, 'Target reassignment option not found or type mismatch');
      }

      await withTransaction(async (session) => {
        const userObjectId = new Types.ObjectId(userId);
        const sourceObjectId = new Types.ObjectId(id);
        const targetObjectId = new Types.ObjectId(input.reassignToId);

        // Update applications matching single option fields
        await ApplicationModel.updateMany(
          { userId: userObjectId, statusId: sourceObjectId },
          { $set: { statusId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, priorityId: sourceObjectId },
          { $set: { priorityId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, workModeId: sourceObjectId },
          { $set: { workModeId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, jobTypeId: sourceObjectId },
          { $set: { jobTypeId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, levelId: sourceObjectId },
          { $set: { levelId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, sourceId: sourceObjectId },
          { $set: { sourceId: targetObjectId } },
          { session },
        );
        await ApplicationModel.updateMany(
          { userId: userObjectId, cvVersionId: sourceObjectId },
          { $set: { cvVersionId: targetObjectId } },
          { session },
        );

        // For labels array: pull old, add new
        await ApplicationModel.updateMany(
          { userId: userObjectId, labelIds: sourceObjectId },
          {
            $pull: { labelIds: sourceObjectId },
            $addToSet: { labelIds: targetObjectId },
          },
          { session },
        );

        option.archivedAt = new Date();
        await option.save({ session });
      });
    } else {
      option.archivedAt = new Date();
      await option.save();
    }

    return OptionMapper.toDto(option);
  }

  public async restore(userId: string, id: string): Promise<OptionDto> {
    const option = await this.optionRepository.findOwnedById(userId, id);
    if (!option) {
      throw new NotFoundError();
    }
    option.archivedAt = null;
    await option.save();
    return OptionMapper.toDto(option);
  }

  public async resetDefaults(
    userId: string,
    input: ResetDefaultOptionsInput,
  ): Promise<OptionDto[]> {
    const existing = await this.optionRepository.findByType(userId, input.type, true);
    // Match by name (label or key), case-insensitive, so renamed or already-present defaults are never duplicated
    const existingNames = new Set(
      existing.flatMap((o) => [o.label.trim().toLowerCase(), o.key.trim().toLowerCase()]),
    );

    const defaultsToAdd = DEFAULT_OPTIONS.filter(
      (def) =>
        def.type === input.type &&
        !existingNames.has(def.label.trim().toLowerCase()) &&
        !existingNames.has(def.key.toLowerCase()),
    );

    if (defaultsToAdd.length === 0) {
      return existing.map(OptionMapper.toDto);
    }

    const last = await this.optionRepository.findLastInType(userId, input.type);
    let lastOrder = last?.order;

    for (const def of defaultsToAdd) {
      const order = FractionalOrder.between(lastOrder, null);
      lastOrder = order;
      await this.optionRepository.createOption({
        userId: new Types.ObjectId(userId),
        type: def.type,
        key: def.key,
        label: def.label,
        color: def.color,
        order,
        meta: def.meta || {},
        aliases: def.aliases || [],
        isDefault: true,
      });
    }

    const all = await this.optionRepository.findByType(userId, input.type, false);
    return all.map(OptionMapper.toDto);
  }
}
