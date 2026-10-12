import { Types } from 'mongoose';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  MoveApplicationInput,
  CreateApplicationResultDto,
  ApplicationDto,
  normalizeStatusMeta,
} from '@hiretrail/shared';
import { ApplicationRepository } from '../repositories/application.repository';
import {
  ApplicationModel,
  ApplicationDoc,
  ApplicationMilestones,
} from '../models/application.model';
import { OptionRepository } from '../../options/repositories/option.repository';
import { CompanyRepository } from '../../companies/repositories/company.repository';
import { ActivityRepository } from '../../activities/repositories/activity.repository';
import { ApplicationMapper } from '../mappers/application.mapper';
import { OptionMapper } from '../../options/mappers/option.mapper';
import { CompanyMapper } from '../../companies/mappers/company.mapper';
import { FractionalOrder } from '../../../core/value-objects/fractional-order';
import { MilestoneCalculator } from './milestone.calculator';
import { HistoryDiff } from './history-diff';
import { DuplicateDetector } from './duplicate.detector';
import { HtmlSanitizer } from '../../../core/security/html-sanitizer';
import { NotFoundError, ConflictError } from '../../../core/errors/domain-errors';
import { withTransaction } from '../../../core/db/transaction';

export class ApplicationCommandService {
  constructor(
    private readonly applicationRepository: ApplicationRepository,
    private readonly optionRepository: OptionRepository,
    private readonly companyRepository: CompanyRepository,
    private readonly activityRepository: ActivityRepository,
  ) {}

  public async create(
    userId: string,
    input: CreateApplicationInput,
  ): Promise<CreateApplicationResultDto> {
    const statusOption = await this.optionRepository.findOwnedById(userId, input.statusId);
    if (!statusOption) {
      throw new NotFoundError(undefined, 'Status option not found');
    }

    const { category: statusCategory, closedReason } = normalizeStatusMeta(statusOption.meta);

    const lastInLane = await this.applicationRepository.findLastInLane(userId, input.statusId);
    const boardOrder = FractionalOrder.between(lastInLane?.boardOrder, null);

    const pastApps = await this.applicationRepository.findForUserInPastDays(userId, 90);
    const possibleDuplicates = DuplicateDetector.findDuplicates(
      pastApps,
      input.companyName,
      input.roleTitle,
    );

    const cleanNotesHtml = input.notesHtml ? HtmlSanitizer.sanitize(input.notesHtml) : undefined;
    const cleanJobDescHtml = input.jobDescriptionHtml
      ? HtmlSanitizer.sanitize(input.jobDescriptionHtml)
      : undefined;

    const appliedDate = input.dates?.appliedAt ? new Date(input.dates.appliedAt) : undefined;
    const milestones = MilestoneCalculator.calculateMilestones(
      {},
      statusCategory,
      appliedDate,
      closedReason,
    );

    const savedDoc = await withTransaction(async (session) => {
      let finalCompanyId = input.companyId ? new Types.ObjectId(input.companyId) : null;

      if (!finalCompanyId) {
        const normName = CompanyRepository.normalizeName(input.companyName);
        const existingCompany = await this.companyRepository.findVisibleByNormalizedName(
          userId,
          normName,
        );
        if (existingCompany) {
          finalCompanyId = existingCompany._id;
        } else {
          const createdCompany = await this.companyRepository.createPrivate(
            userId,
            {
              name: input.companyName,
              normalizedName: normName,
              slug: `${normName}-${Date.now().toString(36)}`,
              techStack: [],
              source: { type: 'USER' },
            },
            session,
          );
          finalCompanyId = createdCompany._id;
        }
      }

      const created = await ApplicationModel.create(
        [
          {
            userId: new Types.ObjectId(userId),
            companyId: finalCompanyId,
            companyName: input.companyName,
            roleTitle: input.roleTitle,
            statusId: new Types.ObjectId(input.statusId),
            statusCategory,
            boardOrder,
            priorityId: input.priorityId ? new Types.ObjectId(input.priorityId) : null,
            workModeId: input.workModeId ? new Types.ObjectId(input.workModeId) : null,
            jobTypeId: input.jobTypeId ? new Types.ObjectId(input.jobTypeId) : null,
            levelId: input.levelId ? new Types.ObjectId(input.levelId) : null,
            sourceId: input.sourceId ? new Types.ObjectId(input.sourceId) : null,
            cvVersionId: input.cvVersionId ? new Types.ObjectId(input.cvVersionId) : null,
            labelIds: (input.labelIds || []).map((id) => new Types.ObjectId(id)),
            location: input.location || undefined,
            coverLetter: input.coverLetter ?? false,
            jobUrl: input.jobUrl || undefined,
            jobDescription: cleanJobDescHtml
              ? {
                  html: cleanJobDescHtml,
                  text: cleanJobDescHtml
                    .replace(/<[^>]*>/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim(),
                }
              : undefined,
            salary: input.salary
              ? {
                  min: input.salary.min ?? undefined,
                  max: input.salary.max ?? undefined,
                  currency: input.salary.currency ?? undefined,
                  period: (input.salary.period as 'HOUR' | 'MONTH' | 'YEAR') ?? undefined,
                  expected: input.salary.expected ?? undefined,
                }
              : undefined,
            dates: input.dates
              ? {
                  savedAt: input.dates.savedAt ? new Date(input.dates.savedAt) : undefined,
                  appliedAt: input.dates.appliedAt ? new Date(input.dates.appliedAt) : undefined,
                  deadlineAt: input.dates.deadlineAt ? new Date(input.dates.deadlineAt) : undefined,
                  followUpAt: input.dates.followUpAt ? new Date(input.dates.followUpAt) : undefined,
                  nextInterviewAt: input.dates.nextInterviewAt
                    ? new Date(input.dates.nextInterviewAt)
                    : undefined,
                }
              : undefined,
            milestones,
            contacts: (input.contacts || []).map((c) => ({
              name: c.name,
              role: c.role || undefined,
              email: c.email || undefined,
              phone: c.phone || undefined,
              linkedinUrl: c.linkedinUrl || undefined,
            })),
            notesHtml: cleanNotesHtml,
            ai: input.ai
              ? {
                  aiUsageId: input.ai.aiUsageId
                    ? new Types.ObjectId(input.ai.aiUsageId)
                    : undefined,
                  aiFilledFields: input.ai.aiFilledFields ?? [],
                }
              : undefined,
            lastActivityAt: new Date(),
          },
        ],
        { session },
      );

      const appDoc = created[0] as ApplicationDoc;

      await this.activityRepository.create(
        {
          userId: new Types.ObjectId(userId),
          actorId: new Types.ObjectId(userId),
          actorType: 'USER',
          entityType: 'APPLICATION',
          entityId: appDoc._id,
          type: 'CREATED',
          changes: [],
          summary: `Created application for ${appDoc.roleTitle} at ${appDoc.companyName}`,
        },
        session,
      );

      return appDoc;
    });

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));
    const company = savedDoc.companyId
      ? await this.companyRepository.findVisibleById(userId, savedDoc.companyId.toString())
      : null;

    return {
      application: ApplicationMapper.toDto(
        savedDoc,
        optionsMap,
        company ? CompanyMapper.toSummaryDto(company) : undefined,
      ),
      possibleDuplicates,
    };
  }

  public async update(
    userId: string,
    id: string,
    input: UpdateApplicationInput,
  ): Promise<ApplicationDto> {
    const existing = await this.applicationRepository.findOwnedById(userId, id);
    if (!existing) {
      throw new NotFoundError();
    }

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const changes: Record<string, unknown> = {};

    if (input.companyName !== undefined) changes.companyName = input.companyName;
    if (input.roleTitle !== undefined) changes.roleTitle = input.roleTitle;
    if (input.location !== undefined) changes.location = input.location;
    if (input.coverLetter !== undefined) changes.coverLetter = input.coverLetter;
    if (input.jobUrl !== undefined) changes.jobUrl = input.jobUrl;
    if (input.companyId !== undefined) {
      changes.companyId = input.companyId ? new Types.ObjectId(input.companyId) : null;
    }
    if (input.priorityId !== undefined) {
      changes.priorityId = input.priorityId ? new Types.ObjectId(input.priorityId) : null;
    }
    if (input.workModeId !== undefined) {
      changes.workModeId = input.workModeId ? new Types.ObjectId(input.workModeId) : null;
    }
    if (input.jobTypeId !== undefined) {
      changes.jobTypeId = input.jobTypeId ? new Types.ObjectId(input.jobTypeId) : null;
    }
    if (input.levelId !== undefined) {
      changes.levelId = input.levelId ? new Types.ObjectId(input.levelId) : null;
    }
    if (input.sourceId !== undefined) {
      changes.sourceId = input.sourceId ? new Types.ObjectId(input.sourceId) : null;
    }
    if (input.cvVersionId !== undefined) {
      changes.cvVersionId = input.cvVersionId ? new Types.ObjectId(input.cvVersionId) : null;
    }
    if (input.labelIds !== undefined) {
      changes.labelIds = input.labelIds.map((lid) => new Types.ObjectId(lid));
    }
    if (input.notesHtml !== undefined) {
      changes.notesHtml = input.notesHtml ? HtmlSanitizer.sanitize(input.notesHtml) : '';
    }
    if (input.jobDescriptionHtml !== undefined) {
      const cleanHtml = input.jobDescriptionHtml
        ? HtmlSanitizer.sanitize(input.jobDescriptionHtml)
        : '';
      changes.jobDescription = {
        html: cleanHtml,
        text: cleanHtml
          .replace(/<[^>]*>/g, ' ')
          .replace(/\s+/g, ' ')
          .trim(),
      };
    }

    if (input.salary !== undefined) {
      changes.salary = input.salary;
    }
    if (input.dates !== undefined) {
      changes.dates = input.dates;
    }
    if (input.contacts !== undefined) {
      changes.contacts = input.contacts;
    }

    // Status change check
    let newStatusOption: import('../../options/models/option.model').OptionDoc | null = null;
    if (input.statusId && input.statusId !== existing.statusId.toString()) {
      newStatusOption = await this.optionRepository.findOwnedById(userId, input.statusId);
      if (!newStatusOption) {
        throw new NotFoundError(undefined, 'Status option not found');
      }
      const { category, closedReason } = normalizeStatusMeta(newStatusOption.meta);
      changes.statusId = new Types.ObjectId(input.statusId);
      changes.statusCategory = category;
      changes.milestones = MilestoneCalculator.calculateMilestones(
        existing.milestones,
        category,
        existing.dates?.appliedAt,
        closedReason,
      );
    }

    // Keep the applied milestone (used by the dashboard) in step with an edited applied date
    if (input.dates?.appliedAt) {
      const base = (changes.milestones as ApplicationMilestones | undefined) ?? {
        ...(existing.toObject().milestones ?? {}),
      };
      changes.milestones = { ...base, appliedAt: new Date(input.dates.appliedAt) };
    }

    changes.lastActivityAt = new Date();

    const diff = HistoryDiff.computeDiff(existing.toObject(), changes, (optId) =>
      optId ? optionsMap.get(optId)?.label : undefined,
    );

    const updated = await withTransaction(async (session) => {
      const saved = await ApplicationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), version: input.version },
        { $set: changes, $inc: { version: 1 } },
        { new: true, session },
      );

      if (!saved) {
        throw new ConflictError('Application has been modified elsewhere', {
          currentVersion: existing.version,
        });
      }

      if (diff.length > 0) {
        const isStatusChange = diff.some((d) => d.field === 'status');
        await this.activityRepository.create(
          {
            userId: new Types.ObjectId(userId),
            actorId: new Types.ObjectId(userId),
            actorType: 'USER',
            entityType: 'APPLICATION',
            entityId: saved._id,
            type: isStatusChange ? 'STATUS_CHANGED' : 'UPDATED',
            changes: diff,
            summary: isStatusChange
              ? `Status changed to ${newStatusOption?.label || 'new status'}`
              : `Updated ${diff.map((d) => d.field).join(', ')}`,
          },
          session,
        );
      }

      return saved;
    });

    const company = updated.companyId
      ? await this.companyRepository.findVisibleById(userId, updated.companyId.toString())
      : null;

    return ApplicationMapper.toDto(
      updated,
      optionsMap,
      company ? CompanyMapper.toSummaryDto(company) : undefined,
    );
  }

  public async move(
    userId: string,
    id: string,
    input: MoveApplicationInput,
  ): Promise<ApplicationDto> {
    const existing = await this.applicationRepository.findOwnedById(userId, id);
    if (!existing) {
      throw new NotFoundError();
    }

    const statusOption = await this.optionRepository.findOwnedById(userId, input.statusId);
    if (!statusOption) {
      throw new NotFoundError(undefined, 'Status option not found');
    }

    let beforeOrder: string | undefined = undefined;
    let afterOrder: string | undefined = undefined;

    if (input.beforeId) {
      const beforeApp = await this.applicationRepository.findOwnedById(userId, input.beforeId);
      if (beforeApp) beforeOrder = beforeApp.boardOrder;
    }
    if (input.afterId) {
      const afterApp = await this.applicationRepository.findOwnedById(userId, input.afterId);
      if (afterApp) afterOrder = afterApp.boardOrder;
    }

    const newOrder = FractionalOrder.between(beforeOrder, afterOrder);

    const { category: newCategory, closedReason } = normalizeStatusMeta(statusOption.meta);
    const isStatusChanged = existing.statusId.toString() !== input.statusId;

    const milestones = isStatusChanged
      ? MilestoneCalculator.calculateMilestones(
          existing.milestones,
          newCategory,
          existing.dates?.appliedAt,
          closedReason,
        )
      : existing.milestones;

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));

    const updated = await withTransaction(async (session) => {
      const saved = await ApplicationModel.findOneAndUpdate(
        { _id: new Types.ObjectId(id), userId: new Types.ObjectId(userId), version: input.version },
        {
          $set: {
            statusId: new Types.ObjectId(input.statusId),
            statusCategory: newCategory,
            boardOrder: newOrder,
            milestones,
            lastActivityAt: new Date(),
          },
          $inc: { version: 1 },
        },
        { new: true, session },
      );

      if (!saved) {
        throw new ConflictError('Application has been moved or modified elsewhere', {
          currentVersion: existing.version,
        });
      }

      if (isStatusChanged) {
        const fromLabel = optionsMap.get(existing.statusId.toString())?.label || 'Previous';
        const toLabel = statusOption.label;
        await this.activityRepository.create(
          {
            userId: new Types.ObjectId(userId),
            actorId: new Types.ObjectId(userId),
            actorType: 'USER',
            entityType: 'APPLICATION',
            entityId: saved._id,
            type: 'STATUS_CHANGED',
            changes: [
              {
                field: 'status',
                from: { id: existing.statusId.toString(), label: fromLabel },
                to: { id: input.statusId, label: toLabel },
              },
            ],
            summary: `Moved from ${fromLabel} to ${toLabel}`,
          },
          session,
        );
      }

      return saved;
    });

    const company = updated.companyId
      ? await this.companyRepository.findVisibleById(userId, updated.companyId.toString())
      : null;

    return ApplicationMapper.toDto(
      updated,
      optionsMap,
      company ? CompanyMapper.toSummaryDto(company) : undefined,
    );
  }

  public async archive(userId: string, id: string): Promise<ApplicationDto> {
    const existing = await this.applicationRepository.findOwnedById(userId, id);
    if (!existing) {
      throw new NotFoundError();
    }

    existing.archivedAt = new Date();
    await existing.save();

    await this.activityRepository.create({
      userId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(userId),
      actorType: 'USER',
      entityType: 'APPLICATION',
      entityId: existing._id,
      type: 'ARCHIVED',
      changes: [],
      summary: 'Archived application',
    });

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));
    return ApplicationMapper.toDto(existing, optionsMap);
  }

  public async restore(userId: string, id: string): Promise<ApplicationDto> {
    const existing = await this.applicationRepository.findOwnedById(userId, id);
    if (!existing) {
      throw new NotFoundError();
    }

    existing.archivedAt = null;
    await existing.save();

    await this.activityRepository.create({
      userId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(userId),
      actorType: 'USER',
      entityType: 'APPLICATION',
      entityId: existing._id,
      type: 'RESTORED',
      changes: [],
      summary: 'Restored application from archive',
    });

    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));
    return ApplicationMapper.toDto(existing, optionsMap);
  }

  public async delete(userId: string, id: string): Promise<void> {
    const existing = await this.applicationRepository.findOwnedById(userId, id);
    if (!existing) {
      throw new NotFoundError();
    }

    await this.applicationRepository.softDeleteOwned(userId, id);

    await this.activityRepository.create({
      userId: new Types.ObjectId(userId),
      actorId: new Types.ObjectId(userId),
      actorType: 'USER',
      entityType: 'APPLICATION',
      entityId: existing._id,
      type: 'DELETED',
      changes: [],
      summary: 'Deleted application',
    });
  }

  public async undoDelete(userId: string, id: string): Promise<ApplicationDto> {
    const restored = await this.applicationRepository.restoreOwned(userId, id);
    const options = await this.optionRepository.findAllForUser(userId, true);
    const optionsMap = new Map(options.map((o) => [o._id.toString(), OptionMapper.toDto(o)]));
    return ApplicationMapper.toDto(restored, optionsMap);
  }
}
