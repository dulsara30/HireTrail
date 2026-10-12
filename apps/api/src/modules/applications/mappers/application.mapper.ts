import { ApplicationDoc } from '../models/application.model';
import {
  ApplicationDto,
  ApplicationDatesDto,
  ApplicationListItemDto,
  OptionDto,
  CompanySummaryDto,
} from '@hiretrail/shared';

export class ApplicationMapper {
  /** Applied date falls back to the milestone, so moving a card to Applied still shows a date. */
  private static mapDates(doc: ApplicationDoc): ApplicationDatesDto {
    return {
      savedAt: doc.dates?.savedAt?.toISOString() || null,
      appliedAt:
        doc.dates?.appliedAt?.toISOString() || doc.milestones?.appliedAt?.toISOString() || null,
      deadlineAt: doc.dates?.deadlineAt?.toISOString() || null,
      followUpAt: doc.dates?.followUpAt?.toISOString() || null,
      nextInterviewAt: doc.dates?.nextInterviewAt?.toISOString() || null,
    };
  }

  public static toListItemDto(
    doc: ApplicationDoc,
    optionsMap: Map<string, OptionDto> = new Map(),
    companiesMap: Map<string, CompanySummaryDto> = new Map(),
  ): ApplicationListItemDto {
    const statusDto = optionsMap.get(doc.statusId.toString());
    const priorityDto = doc.priorityId ? optionsMap.get(doc.priorityId.toString()) : undefined;
    const resolvedLabels = (doc.labelIds || [])
      .map((id) => optionsMap.get(id.toString()))
      .filter((opt): opt is OptionDto => Boolean(opt));

    const resolvedCompany = doc.companyId ? companiesMap.get(doc.companyId.toString()) : undefined;

    return {
      id: doc._id.toString(),
      companyName: doc.companyName,
      roleTitle: doc.roleTitle,
      statusId: doc.statusId.toString(),
      statusCategory: doc.statusCategory,
      boardOrder: doc.boardOrder,
      priorityId: doc.priorityId ? doc.priorityId.toString() : null,
      labelIds: (doc.labelIds || []).map((id) => id.toString()),
      location: doc.location || null,
      coverLetter: doc.coverLetter ?? false,
      dates: ApplicationMapper.mapDates(doc),
      lastActivityAt: doc.lastActivityAt.toISOString(),
      archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
      version: doc.version,
      resolvedStatus: statusDto,
      resolvedPriority: priorityDto,
      resolvedLabels,
      resolvedCompany,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
    };
  }

  public static toDto(
    doc: ApplicationDoc,
    optionsMap: Map<string, OptionDto> = new Map(),
    companySummary?: CompanySummaryDto,
  ): ApplicationDto {
    const statusDto = optionsMap.get(doc.statusId.toString());
    const priorityDto = doc.priorityId ? optionsMap.get(doc.priorityId.toString()) : undefined;
    const workModeDto = doc.workModeId ? optionsMap.get(doc.workModeId.toString()) : undefined;
    const jobTypeDto = doc.jobTypeId ? optionsMap.get(doc.jobTypeId.toString()) : undefined;
    const levelDto = doc.levelId ? optionsMap.get(doc.levelId.toString()) : undefined;
    const sourceDto = doc.sourceId ? optionsMap.get(doc.sourceId.toString()) : undefined;
    const cvVersionDto = doc.cvVersionId ? optionsMap.get(doc.cvVersionId.toString()) : undefined;
    const resolvedLabels = (doc.labelIds || [])
      .map((id) => optionsMap.get(id.toString()))
      .filter((opt): opt is OptionDto => Boolean(opt));

    return {
      id: doc._id.toString(),
      userId: doc.userId.toString(),
      companyId: doc.companyId ? doc.companyId.toString() : null,
      companyName: doc.companyName,
      roleTitle: doc.roleTitle,
      statusId: doc.statusId.toString(),
      statusCategory: doc.statusCategory,
      boardOrder: doc.boardOrder,
      priorityId: doc.priorityId ? doc.priorityId.toString() : null,
      workModeId: doc.workModeId ? doc.workModeId.toString() : null,
      jobTypeId: doc.jobTypeId ? doc.jobTypeId.toString() : null,
      levelId: doc.levelId ? doc.levelId.toString() : null,
      sourceId: doc.sourceId ? doc.sourceId.toString() : null,
      cvVersionId: doc.cvVersionId ? doc.cvVersionId.toString() : null,
      labelIds: (doc.labelIds || []).map((id) => id.toString()),
      location: doc.location || null,
      coverLetter: doc.coverLetter ?? false,
      jobUrl: doc.jobUrl || null,
      contactEmail: doc.contactEmail || null,
      resumeUrl: doc.resumeUrl || null,
      jobDescription: doc.jobDescription,
      salary: doc.salary
        ? {
            min: doc.salary.min ?? null,
            max: doc.salary.max ?? null,
            currency: doc.salary.currency ?? null,
            period: doc.salary.period ?? null,
            expected: doc.salary.expected ?? null,
          }
        : undefined,
      dates: ApplicationMapper.mapDates(doc),
      milestones: doc.milestones
        ? {
            appliedAt: doc.milestones.appliedAt?.toISOString() || null,
            firstResponseAt: doc.milestones.firstResponseAt?.toISOString() || null,
            firstInterviewAt: doc.milestones.firstInterviewAt?.toISOString() || null,
            offerAt: doc.milestones.offerAt?.toISOString() || null,
            acceptedAt: doc.milestones.acceptedAt?.toISOString() || null,
            closedAt: doc.milestones.closedAt?.toISOString() || null,
            closedReason: doc.milestones.closedReason || null,
          }
        : undefined,
      contacts: (doc.contacts || []).map((c) => ({
        name: c.name,
        role: c.role || null,
        email: c.email || null,
        phone: c.phone || null,
        linkedinUrl: c.linkedinUrl || null,
      })),
      notesHtml: doc.notesHtml,
      ai: doc.ai
        ? {
            aiUsageId: doc.ai.aiUsageId ? doc.ai.aiUsageId.toString() : null,
            aiFilledFields: doc.ai.aiFilledFields || [],
          }
        : undefined,
      lastActivityAt: doc.lastActivityAt.toISOString(),
      archivedAt: doc.archivedAt ? doc.archivedAt.toISOString() : null,
      deletedAt: doc.deletedAt ? doc.deletedAt.toISOString() : null,
      version: doc.version,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      resolvedStatus: statusDto,
      resolvedPriority: priorityDto,
      resolvedWorkMode: workModeDto,
      resolvedJobType: jobTypeDto,
      resolvedLevel: levelDto,
      resolvedSource: sourceDto,
      resolvedCvVersion: cvVersionDto,
      resolvedLabels,
      resolvedCompany: companySummary,
    };
  }
}
