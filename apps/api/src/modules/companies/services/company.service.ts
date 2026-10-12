import {
  CreateCompanyInput,
  UpdateCompanyInput,
  CompanyDto,
  CompanySummaryDto,
  ListCompaniesQuery,
  UpsertCompanyNotesInput,
  UserCompanyNotesDto,
} from '@hiretrail/shared';
import { CompanyRepository } from '../repositories/company.repository';
import { UserCompanyNotesRepository } from '../repositories/user-company-notes.repository';
import { ApplicationRepository } from '../../applications/repositories/application.repository';
import { CompanyMapper } from '../mappers/company.mapper';
import {
  DuplicateError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
} from '../../../core/errors/domain-errors';

export class CompanyService {
  constructor(
    private readonly companyRepository: CompanyRepository,
    private readonly notesRepository: UserCompanyNotesRepository,
    private readonly applicationRepository: ApplicationRepository,
  ) {}

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

    const baseSlug =
      input.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '') || 'company';

    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    const doc = await this.companyRepository.createPrivate(userId, {
      name: input.name,
      normalizedName,
      slug,
      website: input.websiteUrl || undefined,
      careersUrl: input.careersUrl || undefined,
      country: input.country || undefined,
      industry: input.industry || undefined,
      size: input.size || undefined,
      city: input.location || undefined,
      description: input.description || undefined,
      techStack: input.techStack || [],
      tier: (input.tier as 'A' | 'B' | null) || null,
      region: input.region as 'LOCAL' | 'FOREIGN' | undefined,
      source: { type: input.fromAiLookup ? 'AI_LOOKUP' : 'USER' },
      verification: { status: 'UNVERIFIED' },
    });

    return CompanyMapper.toDto(doc);
  }

  public async updatePrivate(
    userId: string,
    id: string,
    input: UpdateCompanyInput,
  ): Promise<CompanyDto> {
    const existing = await this.companyRepository.findVisibleById(userId, id);
    if (!existing) {
      throw new NotFoundError(undefined, 'Company not found');
    }

    if (existing.ownerId === null || existing.ownerId.toString() !== userId) {
      throw new ForbiddenError('You can only edit your own private companies');
    }

    const updates: Record<string, unknown> = {};
    if (input.name !== undefined) {
      updates.name = input.name;
      updates.normalizedName = CompanyRepository.normalizeName(input.name);
    }
    if (input.websiteUrl !== undefined) updates.website = input.websiteUrl || undefined;
    if (input.location !== undefined) updates.city = input.location || undefined;
    if (input.description !== undefined) updates.description = input.description || undefined;
    if (input.techStack !== undefined) updates.techStack = input.techStack;
    if (input.tier !== undefined) updates.tier = input.tier;
    if (input.region !== undefined) updates.region = input.region;

    const updated = await this.companyRepository.updatePrivate(userId, id, updates);
    if (!updated) {
      throw new NotFoundError(undefined, 'Company not found');
    }

    return this.getVisibleByIdOrSlug(userId, id);
  }

  public async deletePrivate(userId: string, id: string): Promise<void> {
    const existing = await this.companyRepository.findVisibleById(userId, id);
    if (!existing) {
      throw new NotFoundError(undefined, 'Company not found');
    }

    if (existing.ownerId === null || existing.ownerId.toString() !== userId) {
      throw new ForbiddenError('You can only delete your own private companies');
    }

    // Check if any application references this company
    const applications = await this.applicationRepository.listUserApplications(userId, {
      companyId: id,
    });
    if (applications.length > 0) {
      throw new ConflictError(
        'Cannot delete company because you have applications associated with it',
      );
    }

    await this.companyRepository.softDeletePrivate(userId, id);
  }

  public async list(
    userId: string,
    query: ListCompaniesQuery,
  ): Promise<{ items: CompanySummaryDto[]; nextCursor: string | null; totalCount: number }> {
    const result = await this.companyRepository.listVisible(userId, {
      q: query.q,
      region: query.region as 'LOCAL' | 'FOREIGN' | undefined,
      tier: query.tier as 'A' | 'B' | undefined,
      verification: query.verification as 'VERIFIED' | 'UNVERIFIED' | 'FAILED' | undefined,
      cursor: query.cursor,
      limit: query.limit,
    });

    // Check user applications count for each company
    const applications = await this.applicationRepository.listUserApplications(userId, {});
    const appCompanyIdSet = new Set(applications.map((a) => a.companyId?.toString()));

    let items = result.items.map((doc) =>
      CompanyMapper.toSummaryDto(doc, appCompanyIdSet.has(doc._id.toString())),
    );

    if (query.hasApplications === 'true') {
      items = items.filter((item) => item.hasApplications);
    } else if (query.hasApplications === 'false') {
      items = items.filter((item) => !item.hasApplications);
    }

    return {
      items,
      nextCursor: result.nextCursor,
      totalCount: result.totalCount,
    };
  }

  public async search(userId: string, query?: string, limit = 20): Promise<CompanySummaryDto[]> {
    const list = await this.companyRepository.searchVisible(userId, query, limit);
    return list.map((doc) => CompanyMapper.toSummaryDto(doc));
  }

  public async getVisibleByIdOrSlug(userId: string, idOrSlug: string): Promise<CompanyDto> {
    const doc = await this.companyRepository.findVisibleBySlugOrId(userId, idOrSlug);
    if (!doc) {
      throw new NotFoundError(undefined, 'Company not found');
    }

    const [notes, applications] = await Promise.all([
      this.notesRepository.findByCompany(userId, doc._id.toString()),
      this.applicationRepository.listUserApplications(userId, {
        companyId: doc._id.toString(),
      }),
    ]);

    const myApplicationsSummary = applications.map((app) => ({
      id: app._id.toString(),
      roleTitle: app.roleTitle,
      appliedAt: app.milestones?.appliedAt?.toISOString() || null,
    }));

    return CompanyMapper.toDto(doc, notes, myApplicationsSummary);
  }

  public async upsertNotes(
    userId: string,
    companyId: string,
    input: UpsertCompanyNotesInput,
  ): Promise<UserCompanyNotesDto> {
    const company = await this.companyRepository.findVisibleById(userId, companyId);
    if (!company) {
      throw new NotFoundError(undefined, 'Company not found');
    }

    const updated = await this.notesRepository.upsertNotes(userId, companyId, {
      myRating: input.myRating,
      notesHtml: input.notesHtml,
    });

    return {
      myRating: updated.myRating,
      notesHtml: updated.notesHtml,
      updatedAt: updated.updatedAt.toISOString(),
    };
  }
}
