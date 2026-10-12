export interface CompanySummaryDto {
  id: string;
  name: string;
  slug?: string;
  domain?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  isGlobal: boolean;
  tier?: 'A' | 'B' | null;
  region?: 'LOCAL' | 'FOREIGN';
  verification?: {
    status: 'UNVERIFIED' | 'VERIFIED' | 'FAILED';
    score?: number | null;
    checkedAt?: string | null;
    note?: string | null;
  };
  hasApplications?: boolean;
}

export interface CompanyReportRatingsDto {
  culture?: number;
  workExperience?: number;
  salary?: number;
  learning?: number;
  overall?: number;
  scale?: number;
  appeal?: number;
}

export interface UserCompanyNotesDto {
  myRating?: number | null;
  notesHtml?: string | null;
  updatedAt?: string;
}

export interface CompanyApplicationSummaryDto {
  id: string;
  roleTitle: string;
  statusLabel?: string;
  statusColor?: string;
  appliedAt?: string | null;
}

export interface CompanyDto extends CompanySummaryDto {
  ownerId?: string | null;
  aliases?: string[];
  country?: string;
  city?: string;
  careersUrl?: string;
  linkedinUrl?: string;
  contactEmail?: string;
  foundedYear?: string;
  size?: string;
  industry?: string;
  techStack?: string[];
  description?: string;
  hiringModel?: string;
  reportRatings?: CompanyReportRatingsDto;
  myNotes?: UserCompanyNotesDto | null;
  myApplications?: CompanyApplicationSummaryDto[];
  source?: {
    type: 'ADMIN' | 'SEED' | 'USER_SUBMITTED' | 'USER' | 'AI_LOOKUP';
    ref?: string;
    importedAt?: string;
  };
  createdAt: string;
  updatedAt: string;
}
