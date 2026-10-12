export interface KpiMetricDto {
  value: number;
  previousValue: number;
  changePercentage: number | null; // e.g. +12.5 or -5.0, null if no previous baseline
}

export interface DashboardSummaryDto {
  range: '7d' | '30d' | '90d' | 'ytd' | 'all';
  activeApplications: KpiMetricDto;
  appliedThisPeriod: KpiMetricDto;
  responseRate: KpiMetricDto; // percentage 0..100
  interviewRate: KpiMetricDto; // percentage 0..100
  offers: KpiMetricDto;
  avgDaysToFirstResponse: KpiMetricDto; // in days
  followUpsDue: number; // currently due or overdue
  staleApplications: number; // 14+ days no activity
}

export interface FunnelStageDto {
  stage: string;
  count: number;
  percentageOfApplied: number;
}

export interface WeeklyApplicationsDto {
  weekLabel: string; // e.g. "Oct 05"
  count: number;
  byWorkMode: Record<string, number>;
}

export interface StatusDistributionDto {
  statusId: string;
  label: string;
  color: string;
  count: number;
  percentage: number;
}

export interface SourceBreakdownDto {
  sourceId: string | null;
  label: string;
  count: number;
  responseRate: number; // percentage 0..100
}

export interface UpcomingTaskDto {
  id: string;
  applicationId: string;
  companyName: string;
  roleTitle: string;
  type: 'FOLLOW_UP' | 'INTERVIEW';
  title: string;
  dueAt: string;
  isOverdue: boolean;
}

export interface DashboardChartsDto {
  range: string;
  funnel: FunnelStageDto[];
  weekly: WeeklyApplicationsDto[];
  statusDistribution: StatusDistributionDto[];
  sourceBreakdown: SourceBreakdownDto[];
  upcoming: UpcomingTaskDto[];
}
