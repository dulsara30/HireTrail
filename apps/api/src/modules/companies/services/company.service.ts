import { CreateCompanyInput, CompanyDto, CompanySummaryDto } from '@hiretrail/shared';
import { CompanyRepository } from '../repositories/company.repository';
import { CompanyMapper } from '../mappers/company.mapper';
import { DuplicateError, NotFoundError } from '../../../core/errors/domain-errors';

export class CompanyService {
  constructor(private readonly companyRepository: CompanyRepository) {}

  public async createPrivate(userId: string, input: CreateCompanyInput): Promise<CompanyDto> {
    const normalizedName = CompanyRepository.normalizeName(input.name);

    const existing = await this.companyRepository.findVisibleByNormalizedName(
      userId,
      normalizedName,
    );
    if (existing) {
      throw new DuplicateError(
        'A company with this name already exists in your workspace or directory',
        {
          existingId: existing._id.toString(),
        },
      );
    }

    const slug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'company';

    const doc = await this.companyRepository.createPrivate(userId, {
      name: input.name,
      normalizedName,
      slug: `${slug}-${Date.now().toString(36)}`,
      website: input.websiteUrl || undefined,
      city: input.location || undefined,
      techStack: [],
      source: { type: 'USER' },
    });

    return CompanyMapper.toDto(doc);
  }

  public async search(userId: string, query?: string, limit = 20): Promise<CompanySummaryDto[]> {
    const list = await this.companyRepository.searchVisible(userId, query, limit);
    return list.map(CompanyMapper.toSummaryDto);
  }

  public async getVisibleById(userId: string, id: string): Promise<CompanyDto> {
    const doc = await this.companyRepository.findVisibleById(userId, id);
    if (!doc) {
      throw new NotFoundError(undefined, 'Company not found');
    }
    return CompanyMapper.toDto(doc);
  }
}
