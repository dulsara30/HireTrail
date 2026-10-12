import { Types, FilterQuery, trusted } from 'mongoose';
import {
  ListApplicationsQuery,
  BoardQuery,
  LaneQuery,
  ApplicationDto,
  ApplicationListItemDto,
  BoardDto,
  BoardLaneDto,
  PageInfo,
  OptionType,
  CompanySummaryDto,
} from '@hiretrail/shared';

import { ApplicationRepository } from '../repositories/application.repository';
import { ApplicationDoc, ApplicationModel } from '../models/application.model';
import { OptionRepository } from '../../options/repositories/option.repository';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { OptionSeedService } from '../../auth/services/option-seed.service';
import { CompanyModel } from '../../companies/models/company.model';
import { ApplicationMapper } from '../mappers/application.mapper';

import { OptionMapper } from '../../options/mappers/option.mapper';
import { CompanyMapper } from '../../companies/mappers/company.mapper';
import { NotFoundError } from '../../../core/errors/domain-errors';
import { Cursor } from '../../../core/http/cursor';

export class ApplicationQueryService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly optionRepository: OptionRepository,
    private readonly companyRepository: CompanyRepository,
  ) {}

  public async list(
    userId: string,
    query: ListApplicationsQuery,
  ): Promise<{ items: ApplicationListItemDto[]; page: PageInfo }> {
    const filter = this.buildFilter(userId, query);
    const limit = query.limit ?? 25;

    const sortOptions: Record<string, 1 | -1> = {};
    const sortField = query.sort || 'updatedAt';
    const sortDirection = query.order === 'asc' ? 1 : -1;
    sortOptions[sortField] = sortDirection;
    sortOptions._id = -1;

    if (query.cursor) {
      const decoded = Cursor.decode<{ _id: string }>(query.cursor);
      if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
        filter._id = trusted({ $lt: new Types.ObjectId(decoded._id) });
      }
    }

    const docs = await ApplicationModel.find(filter)
      .sort(sortOptions)
      .limit(limit + 1)
      .exec();

    const hasMore = docs.length > limit;
    const items = hasMore ? docs.slice(0, limit) : docs;
    const lastItem = items[items.length - 1];

    const nextCursor =
      hasMore && lastItem ? Cursor.encode({ _id: lastItem._id.toString() }) : undefined;

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const companyIds = items
      .map((i) => i.companyId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const companies = await CompanyModel.find({ _id: trusted({ $in: companyIds }) }).exec();
    const companiesMap = new Map<string, CompanySummaryDto>(
      companies.map((c) => [c._id.toString(), CompanyMapper.toSummaryDto(c)]),
    );

    const resultItems = items.map((doc: ApplicationDoc) =>
      ApplicationMapper.toListItemDto(doc, optionsMap, companiesMap),
    );

    return {
      items: resultItems,
      page: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  }

  public async getBoard(userId: string, query: BoardQuery): Promise<BoardDto> {
    let statuses = await this.optionRepository.findByType(userId, OptionType.STATUS, false);

    // If user was created before options seeding or has no options, ensure defaults
    if (statuses.length === 0) {
      const existingAny = await this.optionRepository.findAllForUser(userId, true);
      if (existingAny.length === 0) {
        const seedService = new OptionSeedService();
        await seedService.seedDefaultsForUser(userId);
        statuses = await this.optionRepository.findByType(userId, OptionType.STATUS, false);
      }
    }

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const lanes: BoardLaneDto[] = [];

    for (const status of statuses) {
      const filter = this.buildFilter(userId, {
        archived: query.archived,
        q: query.q,
        priorityIds: query.priorityIds,
        labelIds: query.labelIds,
        workModeIds: query.workModeIds,
        sourceIds: query.sourceIds,
      });

      filter.statusId = status._id;

      const total = await ApplicationModel.countDocuments(filter);

      const items = await ApplicationModel.find(filter)
        .sort({ boardOrder: 1, _id: 1 })
        .limit(51)
        .exec();

      const hasMore = items.length > 50;
      const resultItems = hasMore ? items.slice(0, 50) : items;
      const lastItem = resultItems[resultItems.length - 1];

      const nextCursor =
        hasMore && lastItem ? Cursor.encode({ _id: lastItem._id.toString() }) : undefined;

      const companyIds = resultItems
        .map((i) => i.companyId)
        .filter((id): id is Types.ObjectId => Boolean(id));
      const companies = await CompanyModel.find({ _id: trusted({ $in: companyIds }) }).exec();
      const companiesMap = new Map<string, CompanySummaryDto>(
        companies.map((c) => [c._id.toString(), CompanyMapper.toSummaryDto(c)]),
      );

      lanes.push({
        status: OptionMapper.toDto(status),
        total,
        items: resultItems.map((doc: ApplicationDoc) =>
          ApplicationMapper.toListItemDto(doc, optionsMap, companiesMap),
        ),
        nextCursor,
      });
    }

    return { lanes };
  }

  public async getLaneItems(
    userId: string,
    statusId: string,
    query: LaneQuery,
  ): Promise<{ items: ApplicationListItemDto[]; page: PageInfo }> {
    const limit = query.limit ?? 25;
    const filter = this.buildFilter(userId, query);
    filter.statusId = new Types.ObjectId(statusId);

    if (query.cursor) {
      const decoded = Cursor.decode<{ _id: string }>(query.cursor);
      if (decoded?._id && Types.ObjectId.isValid(decoded._id)) {
        filter._id = trusted({ $gt: new Types.ObjectId(decoded._id) });
      }
    }

    const items = await ApplicationModel.find(filter)
      .sort({ boardOrder: 1, _id: 1 })
      .limit(limit + 1)
      .exec();

    const hasMore = items.length > limit;
    const resultItems = hasMore ? items.slice(0, limit) : items;
    const lastItem = resultItems[resultItems.length - 1];

    const nextCursor =
      hasMore && lastItem ? Cursor.encode({ _id: lastItem._id.toString() }) : undefined;

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const companyIds = resultItems
      .map((i) => i.companyId)
      .filter((id): id is Types.ObjectId => Boolean(id));
    const companies = await CompanyModel.find({ _id: trusted({ $in: companyIds }) }).exec();
    const companiesMap = new Map<string, CompanySummaryDto>(
      companies.map((c) => [c._id.toString(), CompanyMapper.toSummaryDto(c)]),
    );

    return {
      items: resultItems.map((doc: ApplicationDoc) =>
        ApplicationMapper.toListItemDto(doc, optionsMap, companiesMap),
      ),
      page: {
        nextCursor,
        hasMore,
        limit,
      },
    };
  }

  public async getById(userId: string, id: string): Promise<ApplicationDto> {
    const doc = await this.applicationRepository.findOwnedById(userId, id);
    if (!doc) {
      throw new NotFoundError();
    }

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const company = doc.companyId
      ? await this.companyRepository.findVisibleById(userId, doc.companyId.toString())
      : null;

    return ApplicationMapper.toDto(
      doc,
      optionsMap,
      company ? CompanyMapper.toSummaryDto(company) : undefined,
    );
  }

  public buildFilter(
    userId: string,
    query: Partial<ListApplicationsQuery>,
  ): FilterQuery<ApplicationDoc> {
    const filter: FilterQuery<ApplicationDoc> = {
      userId: new Types.ObjectId(userId),
      deletedAt: null,
      archivedAt: query.archived ? trusted({ $ne: null }) : null,
    };

    if (query.q) {
      const regex = new RegExp(query.q.trim(), 'i');
      filter.$or = [{ roleTitle: regex }, { companyName: regex }];
    }

    if (query.statusIds && query.statusIds.length > 0) {
      filter.statusId = trusted({
        $in: query.statusIds
          .filter((id): id is string => Boolean(id))
          .map((id) => new Types.ObjectId(id)),
      });
    }

    if (query.priorityIds && query.priorityIds.length > 0) {
      filter.priorityId = trusted({
        $in: query.priorityIds
          .filter((id): id is string => Boolean(id))
          .map((id) => new Types.ObjectId(id)),
      });
    }

    if (query.workModeIds && query.workModeIds.length > 0) {
      filter.workModeId = trusted({
        $in: query.workModeIds
          .filter((id): id is string => Boolean(id))
          .map((id) => new Types.ObjectId(id)),
      });
    }

    if (query.sourceIds && query.sourceIds.length > 0) {
      filter.sourceId = trusted({
        $in: query.sourceIds
          .filter((id): id is string => Boolean(id))
          .map((id) => new Types.ObjectId(id)),
      });
    }

    if (query.labelIds && query.labelIds.length > 0) {
      filter.labelIds = trusted({
        $in: query.labelIds
          .filter((id): id is string => Boolean(id))
          .map((id) => new Types.ObjectId(id)),
      });
    }

    if (query.companyId) {
      filter.companyId = new Types.ObjectId(query.companyId);
    }

    if (query.appliedFrom || query.appliedTo) {
      const dateFilter: Record<string, Date> = {};
      if (query.appliedFrom) dateFilter.$gte = new Date(query.appliedFrom);
      if (query.appliedTo) dateFilter.$lte = new Date(query.appliedTo);
      filter['dates.appliedAt'] = trusted(dateFilter);
    }

    if (query.followUpDue) {
      filter['dates.followUpAt'] = trusted({ $lte: new Date() });
    }

    return filter;
  }
}
