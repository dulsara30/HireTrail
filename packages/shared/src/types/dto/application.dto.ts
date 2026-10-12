import { OptionDto } from './option.dto';
import { CompanySummaryDto } from './company.dto';
import { StatusCategory, ClosedReason } from '../../constants/options';

export interface ApplicationContactDto {
  name: string;
  role?: string | null;
  email?: string | null;
  phone?: string | null;
  linkedinUrl?: string | null;
}

export interface ApplicationSalaryDto {
  min?: number | null;
  max?: number | null;
  currency?: string | null;
  period?: 'HOUR' | 'MONTH' | 'YEAR' | null;
  expected?: number | null;
}

export interface ApplicationDatesDto {
  savedAt?: string | null;
  appliedAt?: string | null;
  deadlineAt?: string | null;
  followUpAt?: string | null;
  nextInterviewAt?: string | null;
}

export interface ApplicationMilestonesDto {
  appliedAt?: string | null;
  firstResponseAt?: string | null;
  firstInterviewAt?: string | null;
  offerAt?: string | null;
  acceptedAt?: string | null;
  closedAt?: string | null;
  closedReason?: ClosedReason | null;
}

export interface ApplicationAiDto {
  aiUsageId?: string | null;
  aiFilledFields?: string[];
}

export interface ApplicationDto {
  id: string;
  userId: string;
  companyId?: string | null;
  companyName: string;
  roleTitle: string;
  statusId: string;
  statusCategory: StatusCategory;
  boardOrder: string;
  priorityId?: string | null;
  workModeId?: string | null;
  jobTypeId?: string | null;
  levelId?: string | null;
  sourceId?: string | null;
  cvVersionId?: string | null;
  labelIds: string[];
  location?: string | null;
  jobUrl?: string | null;
  jobDescription?: {
    html?: string;
    text?: string;
  };
  salary?: ApplicationSalaryDto;
  dates?: ApplicationDatesDto;
  milestones?: ApplicationMilestonesDto;
  contacts: ApplicationContactDto[];
  notesHtml?: string;
  ai?: ApplicationAiDto;
  lastActivityAt: string;
  archivedAt?: string | null;
  deletedAt?: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
  // Resolved references for UI
  resolvedStatus?: OptionDto;
  resolvedPriority?: OptionDto;
  resolvedWorkMode?: OptionDto;
  resolvedJobType?: OptionDto;
  resolvedLevel?: OptionDto;
  resolvedSource?: OptionDto;
  resolvedCvVersion?: OptionDto;
  resolvedLabels?: OptionDto[];
  resolvedCompany?: CompanySummaryDto;
}

export interface ApplicationListItemDto {
  id: string;
  companyName: string;
  roleTitle: string;
  statusId: string;
  statusCategory: StatusCategory;
  boardOrder: string;
  priorityId?: string | null;
  labelIds: string[];
  location?: string | null;
  dates?: ApplicationDatesDto;
  lastActivityAt: string;
  archivedAt?: string | null;
  version: number;
  resolvedStatus?: OptionDto;
  resolvedPriority?: OptionDto;
  resolvedLabels?: OptionDto[];
  resolvedCompany?: CompanySummaryDto;
  createdAt: string;
  updatedAt: string;
}

export interface DuplicateWarningDto {
  id: string;
  roleTitle: string;
  companyName: string;
  appliedAt?: string | null;
  statusLabel?: string;
}

export interface CreateApplicationResultDto {
  application: ApplicationDto;
  possibleDuplicates: DuplicateWarningDto[];
}
