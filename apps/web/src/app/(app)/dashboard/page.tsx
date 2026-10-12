'use client';

import React from 'react';
import { useDashboardSummary } from '../../../api/hooks/queries/useDashboardSummary';
import { useDashboardCharts } from '../../../api/hooks/queries/useDashboardCharts';
import { useDashboardActivityInfinite } from '../../../api/hooks/queries/useDashboardActivityInfinite';
import { InsightsCard } from '../../../components/organisms/dashboard/InsightsCard';
import { OnboardingTips } from '../../../components/organisms/dashboard/OnboardingTips';
import { KpiCard } from '../../../components/molecules/KpiCard/KpiCard';
import { FunnelChart } from '../../../components/organisms/dashboard/FunnelChart';
import { WeeklyChart } from '../../../components/organisms/dashboard/WeeklyChart';
import { StatusDistributionChart } from '../../../components/organisms/dashboard/StatusDistributionChart';
import { SourceBreakdownChart } from '../../../components/organisms/dashboard/SourceBreakdownChart';
import { RecentActivityList } from '../../../components/organisms/dashboard/RecentActivityList';
import { Badge } from '../../../components/atoms/Badge';
import { ActivityDto, UpcomingTaskDto } from '@hiretrail/shared';

export default function DashboardPage() {
  const [range, setRange] = React.useState<'7d' | '30d' | '90d' | 'ytd' | 'all'>('30d');

  const {
    data: summary,
    isLoading: isSummaryLoading,
    isError: isSummaryError,
  } = useDashboardSummary(range);

  const {
    data: charts,
    isLoading: isChartsLoading,
    isError: isChartsError,
  } = useDashboardCharts(range);

  const { data: activityData, isLoading: isActivityLoading } = useDashboardActivityInfinite();

  const allActivities: ActivityDto[] = React.useMemo(() => {
    return activityData?.pages.flatMap((p: { items: ActivityDto[] }) => p.items) || [];
  }, [activityData]);

  const ranges: { key: typeof range; label: string }[] = [
    { key: '7d', label: 'Last 7 days' },
    { key: '30d', label: 'Last 30 days' },
    { key: '90d', label: 'Last 90 days' },
    { key: 'ytd', label: 'This year' },
    { key: 'all', label: 'All time' },
  ];

  return (
    <div className="space-y-8">
      {/* Top Header & Range Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Career Pipeline Analytics
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Real-time conversion metrics, milestone tracking, and action items.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center rounded-xl border border-border-default bg-bg-surface p-1 shadow-xs">
          {ranges.map((r) => (
            <button
              key={r.key}
              onClick={() => setRange(r.key)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                range === r.key
                  ? 'bg-bg-accent-subtle text-text-accent font-semibold shadow-xs'
                  : 'text-text-secondary hover:text-text-primary'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards Grid */}
      {isSummaryLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <div
              key={i}
              className="h-28 bg-bg-surface border border-border-default rounded-xl animate-pulse"
            />
          ))}
        </div>
      ) : isSummaryError || !summary ? (
        <div className="p-4 text-center bg-bg-surface border border-border-default rounded-xl text-text-danger text-sm">
          Failed to load summary analytics.
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard
            label="Active Applications"
            tone="accent"
            value={summary.activeApplications.value}
            subValue="In pipeline today"
          />
          <KpiCard
            label="Applied This Period"
            tone="info"
            value={summary.appliedThisPeriod.value}
            changePercentage={summary.appliedThisPeriod.changePercentage}
            subValue="vs. previous period"
          />
          <KpiCard
            label="Response Rate"
            tone="teal"
            value={summary.responseRate.value}
            suffix="%"
            changePercentage={summary.responseRate.changePercentage}
            subValue="First employer reply"
          />
          <KpiCard
            label="Interview Rate"
            tone="purple"
            value={summary.interviewRate.value}
            suffix="%"
            changePercentage={summary.interviewRate.changePercentage}
            subValue="Invited to interview"
          />
          <KpiCard
            label="Job Offers"
            tone="success"
            value={summary.offers.value}
            changePercentage={summary.offers.changePercentage}
            subValue="Received in period"
          />
          <KpiCard
            label="Avg. Time to Reply"
            tone="orange"
            value={summary.avgDaysToFirstResponse.value}
            suffix="d"
            changePercentage={summary.avgDaysToFirstResponse.changePercentage}
            subValue="Days to first response"
          />
          <KpiCard
            label="Follow-ups Due"
            tone="accent"
            value={summary.followUpsDue}
            subValue={summary.followUpsDue > 0 ? 'Requires attention today' : 'All caught up'}
          />
          <KpiCard
            label="Stale Applications"
            tone="danger"
            value={summary.staleApplications}
            subValue="No updates in 14+ days"
          />
        </div>
      )}

      {summary && summary.activeApplications.value === 0 && <OnboardingTips />}

      {/* Charts Grid */}
      {isChartsLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-bg-surface border border-border-default rounded-2xl animate-pulse" />
          <div className="h-80 bg-bg-surface border border-border-default rounded-2xl animate-pulse" />
          <div className="h-80 bg-bg-surface border border-border-default rounded-2xl animate-pulse" />
          <div className="h-80 bg-bg-surface border border-border-default rounded-2xl animate-pulse" />
        </div>
      ) : isChartsError || !charts ? (
        <div className="p-4 text-center bg-bg-surface border border-border-default rounded-xl text-text-danger text-sm">
          Failed to load pipeline charts.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Funnel Chart */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Pipeline Funnel</h2>
              <p className="text-xs text-text-tertiary">
                Conversion rates across application lifecycle stages
              </p>
            </div>
            <FunnelChart data={charts.funnel} />
          </div>

          {/* Weekly Velocity */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Application Velocity</h2>
              <p className="text-xs text-text-tertiary">
                Weekly application volume over the past 12 weeks
              </p>
            </div>
            <WeeklyChart data={charts.weekly} />
          </div>

          {/* Status Distribution */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Current Status Breakdown</h2>
              <p className="text-xs text-text-tertiary">
                Distribution of current applications in pipeline
              </p>
            </div>
            <StatusDistributionChart data={charts.statusDistribution} />
          </div>

          {/* Source Breakdown */}
          <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
            <div>
              <h2 className="text-base font-bold text-text-primary">Applications by Source</h2>
              <p className="text-xs text-text-tertiary">
                Channels driving submissions and their response yield
              </p>
            </div>
            <SourceBreakdownChart data={charts.sourceBreakdown} />
          </div>
        </div>
      )}

      <InsightsCard />

      {/* Two Column Section: Upcoming Tasks & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Upcoming Tasks */}
        <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">Upcoming Milestones & Tasks</h2>
            <p className="text-xs text-text-tertiary">
              Scheduled interviews and pending follow-ups
            </p>
          </div>

          {charts?.upcoming && charts.upcoming.length > 0 ? (
            <div className="space-y-3">
              {charts.upcoming.map((task: UpcomingTaskDto) => (
                <div
                  key={task.id}
                  className="p-3.5 rounded-xl border border-border-subtle bg-bg-surface-raised flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-text-primary">
                        {task.companyName}
                      </span>
                      <Badge color={task.type === 'INTERVIEW' ? 'accent' : 'orange'}>
                        {task.type}
                      </Badge>
                      {task.isOverdue && <Badge color="danger">Overdue</Badge>}
                    </div>
                    <p className="text-xs text-text-secondary">{task.title}</p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-medium text-text-tertiary block">
                      {new Date(task.dueAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="text-[11px] text-text-tertiary">
                      {new Date(task.dueAt).toLocaleTimeString('en-US', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-tertiary py-8 text-center">
              No upcoming interviews or pending follow-ups scheduled.
            </p>
          )}
        </div>

        {/* Recent Activity Feed */}
        <div className="p-6 bg-bg-surface border border-border-default rounded-2xl shadow-sm border-t-4 border-t-border-accent space-y-4">
          <div>
            <h2 className="text-base font-bold text-text-primary">Recent Pipeline Activity</h2>
            <p className="text-xs text-text-tertiary">Your 10 most recent updates</p>
          </div>

          <div className="max-h-[460px] overflow-y-auto pr-1">
            <RecentActivityList
              activities={allActivities.slice(0, 10)}
              isLoading={isActivityLoading}
              hasNextPage={false}
              isFetchingNextPage={false}
              onLoadMore={() => undefined}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
