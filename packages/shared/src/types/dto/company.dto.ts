export interface CompanySummaryDto {
  id: string;
  name: string;
  domain?: string | null;
  logoUrl?: string | null;
  websiteUrl?: string | null;
  location?: string | null;
  isGlobal: boolean;
}

export interface CompanyDto extends CompanySummaryDto {
  ownerId?: string | null;
  tier?: 'A' | 'B' | 'C' | 'UNRANKED';
  region?: string;
  source?: {
    type: 'ADMIN' | 'SEED' | 'USER_SUBMITTED';
  };
  createdAt: string;
  updatedAt: string;
}
