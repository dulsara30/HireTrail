import { OptionDoc } from '../models/option.model';
import { OptionDto, OptionType, OptionColor } from '@hiretrail/shared';

export class OptionMapper {
  public static toDto(doc: OptionDoc): OptionDto {
    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      type: doc.type as OptionType,
      key: doc.key,
      label: doc.label,
      color: doc.color as OptionColor,
      order: doc.order,
      meta: doc.meta,
      aliases: doc.aliases,
      archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }
}
