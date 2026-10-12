import { OptionDto, OptionType } from '@hiretrail/shared';
import { OptionRepository } from '../repositories/option.repository';
import { OptionMapper } from '../mappers/option.mapper';

export class OptionQueryService {
  constructor(private readonly optionRepository: OptionRepository) {}

  public async list(
    userId: string,
    type?: OptionType,
    includeArchived = false,
  ): Promise<OptionDto[] | Record<string, OptionDto[]>> {
    if (type) {
      const options = await this.optionRepository.findByType(userId, type, includeArchived);
      return options.map(OptionMapper.toDto);
    }

    const all = await this.optionRepository.findAllForUser(userId, includeArchived);
    const grouped: Record<string, OptionDto[]> = {};

    for (const opt of all) {
      const typeKey = opt.type as string;
      if (!grouped[typeKey]) {
        grouped[typeKey] = [];
      }
      grouped[typeKey]!.push(OptionMapper.toDto(opt));
    }

    return grouped;
  }

  public async getById(userId: string, id: string): Promise<OptionDto | null> {
    const doc = await this.optionRepository.findOwnedById(userId, id);
    return doc ? OptionMapper.toDto(doc) : null;
  }
}
