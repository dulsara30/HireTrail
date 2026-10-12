import { Types, trusted } from 'mongoose';
import { ApplicationModel, type ApplicationDoc } from '../../applications/models/application.model';
import { CommentModel, type CommentDoc } from '../../comments/models/comment.model';
import { OptionModel, type OptionDoc } from '../../options/models/option.model';
import {
  DashboardSummaryDto,
  DashboardChartsDto,
  KpiMetricDto,
  FunnelStageDto,
  WeeklyApplicationsDto,
  StatusDistributionDto,
  SourceBreakdownDto,
  UpcomingTaskDto,
} from '@hiretrail/shared';

export class DashboardAggregationService {
  private calculateDateRange(range: string): {
    start: Date;
    end: Date;
    prevStart: Date;
    prevEnd: Date;
  } {
    const end = new Date();
    const start = new Date(end);

    let days = 30;
    if (range === '7d') days = 7;
    else if (range === '30d') days = 30;
    else if (range === '90d') days = 90;
    else if (range === 'ytd') {
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      const diffMs = end.getTime() - start.getTime();
      const prevEnd = new Date(start.getTime() - 1);
      const prevStart = new Date(prevEnd.getTime() - diffMs);
      return { start, end, prevStart, prevEnd };
    } else if (range === 'all') {
      start.setFullYear(2000, 0, 1);
      return {
        start,
        end,
        prevStart: new Date(2000, 0, 1),
        prevEnd: new Date(2000, 0, 1),
      };
    }

    start.setDate(end.getDate() - days);
    const prevEnd = new Date(start.getTime() - 1);
    const prevStart = new Date(prevEnd);
    prevStart.setDate(prevEnd.getDate() - days);

    return { start, end, prevStart, prevEnd };
  }

  private calculateMetric(curr: number, prev: number): KpiMetricDto {
    if (prev === 0) {
      return {
        value: curr,
        previousValue: prev,
        changePercentage: curr > 0 ? 100 : 0,
      };
    }
    const change = Number((((curr - prev) / prev) * 100).toFixed(1));
    return {
      value: curr,
      previousValue: prev,
      changePercentage: change,
    };
  }

  public async getSummary(userId: string, range = '30d'): Promise<DashboardSummaryDto> {
    const userOid = new Types.ObjectId(userId);
    const { start, end, prevStart, prevEnd } = this.calculateDateRange(range);

    // 1. Active applications (independent of range: current pipeline state)
    const activeCount = await ApplicationModel.countDocuments({
      userId: userOid,
      archivedAt: null,
      deletedAt: null,
      statusCategory: trusted({ $nin: ['CLOSED', 'ACCEPTED'] }),
    });

    // 2. Applied in current range vs previous range
    const [appliedCurr, appliedPrev] = await Promise.all([
      ApplicationModel.find({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'milestones.appliedAt': trusted({ $gte: start, $lte: end }),
      }).exec(),
      ApplicationModel.find({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'milestones.appliedAt': trusted({ $gte: prevStart, $lte: prevEnd }),
      }).exec(),
    ]);

    // Response rate & Interview rate on those applied in the period
    const currTotal = appliedCurr.length;
    const currResponded = appliedCurr.filter(
      (a: ApplicationDoc) => a.milestones?.firstResponseAt,
    ).length;
    const currInterviewed = appliedCurr.filter(
      (a: ApplicationDoc) => a.milestones?.firstInterviewAt,
    ).length;

    const prevTotal = appliedPrev.length;
    const prevResponded = appliedPrev.filter(
      (a: ApplicationDoc) => a.milestones?.firstResponseAt,
    ).length;
    const prevInterviewed = appliedPrev.filter(
      (a: ApplicationDoc) => a.milestones?.firstInterviewAt,
    ).length;

    const currResponseRate =
      currTotal > 0 ? Number(((currResponded / currTotal) * 100).toFixed(1)) : 0;
    const prevResponseRate =
      prevTotal > 0 ? Number(((prevResponded / prevTotal) * 100).toFixed(1)) : 0;

    const currInterviewRate =
      currTotal > 0 ? Number(((currInterviewed / currTotal) * 100).toFixed(1)) : 0;
    const prevInterviewRate =
      prevTotal > 0 ? Number(((prevInterviewed / prevTotal) * 100).toFixed(1)) : 0;

    // Offers in range
    const [offersCurr, offersPrev] = await Promise.all([
      ApplicationModel.countDocuments({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'milestones.offerAt': trusted({ $gte: start, $lte: end }),
      }),
      ApplicationModel.countDocuments({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'milestones.offerAt': trusted({ $gte: prevStart, $lte: prevEnd }),
      }),
    ]);

    // Avg days to first response (mean firstResponseAt - appliedAt)
    const computeAvgDays = (apps: ApplicationDoc[]) => {
      const responded = apps.filter(
        (a: ApplicationDoc) => a.milestones?.appliedAt && a.milestones?.firstResponseAt,
      );
      if (responded.length === 0) return 0;
      const totalDays = responded.reduce((acc: number, a: ApplicationDoc) => {
        if (!a.milestones?.firstResponseAt || !a.milestones?.appliedAt) return acc;
        const diffMs =
          new Date(a.milestones.firstResponseAt).getTime() -
          new Date(a.milestones.appliedAt).getTime();
        return acc + Math.max(0, diffMs / (1000 * 60 * 60 * 24));
      }, 0);
      return Number((totalDays / responded.length).toFixed(1));
    };

    const avgDaysCurr = computeAvgDays(appliedCurr);
    const avgDaysPrev = computeAvgDays(appliedPrev);

    // Follow-ups due: applications due or comments due
    const now = new Date();
    const [appFollowUps, commentFollowUps] = await Promise.all([
      ApplicationModel.countDocuments({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'dates.followUpAt': trusted({ $lte: now }),
      }),
      CommentModel.countDocuments({
        userId: userOid,
        kind: 'FOLLOW_UP',
        deletedAt: null,
        doneAt: null,
        dueAt: trusted({ $lte: now }),
      }),
    ]);

    // Stale applications: in APPLIED, IN_PROGRESS, INTERVIEW with no activity for 14+ days
    const staleCutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    const staleCount = await ApplicationModel.countDocuments({
      userId: userOid,
      archivedAt: null,
      deletedAt: null,
      statusCategory: trusted({ $in: ['APPLIED', 'IN_PROGRESS', 'INTERVIEW'] }),
      lastActivityAt: trusted({ $lte: staleCutoff }),
    });

    return {
      range: range as DashboardSummaryDto['range'],
      activeApplications: {
        value: activeCount,
        previousValue: activeCount,
        changePercentage: null,
      },
      appliedThisPeriod: this.calculateMetric(currTotal, prevTotal),
      responseRate: this.calculateMetric(currResponseRate, prevResponseRate),
      interviewRate: this.calculateMetric(currInterviewRate, prevInterviewRate),
      offers: this.calculateMetric(offersCurr, offersPrev),
      avgDaysToFirstResponse: this.calculateMetric(avgDaysCurr, avgDaysPrev),
      followUpsDue: appFollowUps + commentFollowUps,
      staleApplications: staleCount,
    };
  }

  public async getCharts(userId: string, range = '30d'): Promise<DashboardChartsDto> {
    const userOid = new Types.ObjectId(userId);
    const { start, end } = this.calculateDateRange(range);

    // 1. Funnel (Applied -> Responded -> Interview -> Offer -> Accepted)
    const appsInRange: ApplicationDoc[] = await ApplicationModel.find({
      userId: userOid,
      archivedAt: null,
      deletedAt: null,
      'milestones.appliedAt': trusted({ $gte: start, $lte: end }),
    }).exec();

    const appliedCount = appsInRange.length;
    const respondedCount = appsInRange.filter(
      (a: ApplicationDoc) => a.milestones?.firstResponseAt,
    ).length;
    const interviewCount = appsInRange.filter(
      (a: ApplicationDoc) => a.milestones?.firstInterviewAt,
    ).length;
    const offerCount = appsInRange.filter((a: ApplicationDoc) => a.milestones?.offerAt).length;
    const acceptedCount = appsInRange.filter(
      (a: ApplicationDoc) => a.milestones?.acceptedAt,
    ).length;

    const funnel: FunnelStageDto[] = [
      {
        stage: 'Applied',
        count: appliedCount,
        percentageOfApplied: appliedCount > 0 ? 100 : 0,
      },
      {
        stage: 'Responded',
        count: respondedCount,
        percentageOfApplied:
          appliedCount > 0 ? Number(((respondedCount / appliedCount) * 100).toFixed(1)) : 0,
      },
      {
        stage: 'Interview',
        count: interviewCount,
        percentageOfApplied:
          appliedCount > 0 ? Number(((interviewCount / appliedCount) * 100).toFixed(1)) : 0,
      },
      {
        stage: 'Offer',
        count: offerCount,
        percentageOfApplied:
          appliedCount > 0 ? Number(((offerCount / appliedCount) * 100).toFixed(1)) : 0,
      },
      {
        stage: 'Accepted',
        count: acceptedCount,
        percentageOfApplied:
          appliedCount > 0 ? Number(((acceptedCount / appliedCount) * 100).toFixed(1)) : 0,
      },
    ];

    // 2. Weekly applications (last 12 weeks)
    const weekly: WeeklyApplicationsDto[] = [];
    const workModeOptions: OptionDoc[] = await OptionModel.find({
      userId: userOid,
      type: 'WORK_MODE',
      archivedAt: null,
    }).exec();
    const workModeMap = new Map<string, string>();
    for (const opt of workModeOptions) {
      workModeMap.set(opt._id.toString(), opt.label);
    }

    for (let i = 11; i >= 0; i--) {
      const wEnd = new Date();
      wEnd.setDate(wEnd.getDate() - i * 7);
      const wStart = new Date(wEnd);
      wStart.setDate(wEnd.getDate() - 7);

      const weekApps: ApplicationDoc[] = await ApplicationModel.find({
        userId: userOid,
        archivedAt: null,
        deletedAt: null,
        'milestones.appliedAt': trusted({ $gte: wStart, $lte: wEnd }),
      }).exec();

      const byWorkMode: Record<string, number> = {};
      for (const opt of workModeOptions) {
        byWorkMode[opt.label] = 0;
      }
      byWorkMode['Unspecified'] = 0;

      for (const a of weekApps) {
        if (a.workModeId && workModeMap.has(a.workModeId.toString())) {
          const label = workModeMap.get(a.workModeId.toString())!;
          byWorkMode[label] = (byWorkMode[label] || 0) + 1;
        } else {
          byWorkMode['Unspecified'] = (byWorkMode['Unspecified'] || 0) + 1;
        }
      }

      const label = `${wStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
      weekly.push({
        weekLabel: label,
        count: weekApps.length,
        byWorkMode,
      });
    }

    // 3. Status distribution (current active board status breakdown)
    const statusOptions: OptionDoc[] = await OptionModel.find({
      userId: userOid,
      type: 'STATUS',
      archivedAt: null,
    })
      .sort({ order: 1 })
      .exec();

    const allActiveApps: ApplicationDoc[] = await ApplicationModel.find({
      userId: userOid,
      archivedAt: null,
      deletedAt: null,
    }).exec();

    const totalActive = allActiveApps.length;
    const statusDistribution: StatusDistributionDto[] = statusOptions.map((opt: OptionDoc) => {
      const count = allActiveApps.filter(
        (a: ApplicationDoc) => a.statusId?.toString() === opt._id.toString(),
      ).length;
      return {
        statusId: opt._id.toString(),
        label: opt.label,
        color: opt.color,
        count,
        percentage: totalActive > 0 ? Number(((count / totalActive) * 100).toFixed(1)) : 0,
      };
    });

    // 4. By source breakdown with response rate
    const sourceOptions: OptionDoc[] = await OptionModel.find({
      userId: userOid,
      type: 'SOURCE',
      archivedAt: null,
    }).exec();

    const sourceBreakdown: SourceBreakdownDto[] = sourceOptions.map((src: OptionDoc) => {
      const apps = appsInRange.filter(
        (a: ApplicationDoc) => a.sourceId?.toString() === src._id.toString(),
      );
      const responded = apps.filter((a: ApplicationDoc) => a.milestones?.firstResponseAt).length;
      return {
        sourceId: src._id.toString(),
        label: src.label,
        count: apps.length,
        responseRate: apps.length > 0 ? Number(((responded / apps.length) * 100).toFixed(1)) : 0,
      };
    });

    // Also include unknown/unspecified source if any
    const unspecifiedSourceApps = appsInRange.filter((a: ApplicationDoc) => !a.sourceId);
    if (unspecifiedSourceApps.length > 0) {
      const responded = unspecifiedSourceApps.filter(
        (a: ApplicationDoc) => a.milestones?.firstResponseAt,
      ).length;
      sourceBreakdown.push({
        sourceId: null,
        label: 'Direct / Other',
        count: unspecifiedSourceApps.length,
        responseRate:
          unspecifiedSourceApps.length > 0
            ? Number(((responded / unspecifiedSourceApps.length) * 100).toFixed(1))
            : 0,
      });
    }

    // 5. Upcoming list (next interviews & follow-ups)
    const now = new Date();
    const upcoming: UpcomingTaskDto[] = [];

    // Next interviews from applications
    const appsWithInterviews: ApplicationDoc[] = await ApplicationModel.find({
      userId: userOid,
      archivedAt: null,
      deletedAt: null,
      'dates.nextInterviewAt': trusted({ $gte: now }),
    })
      .sort({ 'dates.nextInterviewAt': 1 })
      .limit(10)
      .exec();

    for (const app of appsWithInterviews) {
      if (app.dates?.nextInterviewAt) {
        upcoming.push({
          id: `int-${app._id.toString()}`,
          applicationId: app._id.toString(),
          companyName: app.companyName,
          roleTitle: app.roleTitle,
          type: 'INTERVIEW',
          title: `Interview for ${app.roleTitle}`,
          dueAt: app.dates.nextInterviewAt.toISOString(),
          isOverdue: false,
        });
      }
    }

    // Follow-ups from comments
    const followUpComments: CommentDoc[] = await CommentModel.find({
      userId: userOid,
      kind: 'FOLLOW_UP',
      deletedAt: null,
      doneAt: null,
      dueAt: trusted({ $exists: true, $ne: null }),
    })
      .sort({ dueAt: 1 })
      .limit(10)
      .populate('applicationId')
      .exec();

    for (const comment of followUpComments) {
      const app: ApplicationDoc | null = await ApplicationModel.findById(
        comment.applicationId,
      ).exec();
      if (app && !app.deletedAt && !app.archivedAt && comment.dueAt) {
        upcoming.push({
          id: `cmt-${comment._id.toString()}`,
          applicationId: app._id.toString(),
          companyName: app.companyName,
          roleTitle: app.roleTitle,
          type: 'FOLLOW_UP',
          title: comment.bodyHtml.replace(/<[^>]+>/g, '').slice(0, 50) || 'Follow-up task',
          dueAt: comment.dueAt.toISOString(),
          isOverdue: comment.dueAt < now,
        });
      }
    }

    upcoming.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());

    return {
      range,
      funnel,
      weekly,
      statusDistribution,
      sourceBreakdown,
      upcoming: upcoming.slice(0, 15),
    };
  }
}
