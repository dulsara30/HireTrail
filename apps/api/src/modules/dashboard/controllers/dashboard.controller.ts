import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { DashboardAggregationService } from '../services/dashboard-aggregation.service';
import { DashboardInsightsService } from '../services/dashboard-insights.service';
import { ActivityRepository } from '../../activities/repositories/activity.repository';
import { ActivityMapper } from '../../activities/mappers/activity.mapper';
import { DashboardSummaryQuery, DashboardChartsQuery } from '@hiretrail/shared';

export class DashboardController extends BaseController {
  constructor(
    private readonly aggregationService: DashboardAggregationService,
    private readonly activityRepo: ActivityRepository,
    private readonly insightsService: DashboardInsightsService,
  ) {
    super();
  }

  public getInsights = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, await this.insightsService.getLatest(req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  public refreshInsights = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ok(res, await this.insightsService.refresh(req.user!.id));
    } catch (err) {
      next(err);
    }
  };

  public getSummary = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validated?.query ?? req.query) as unknown as DashboardSummaryQuery;
      const summary = await this.aggregationService.getSummary(req.user!.id, query.range || '30d');
      this.ok(res, summary);
    } catch (err) {
      next(err);
    }
  };

  public getCharts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validated?.query ?? req.query) as unknown as DashboardChartsQuery;
      const charts = await this.aggregationService.getCharts(req.user!.id, query.range || '30d');
      this.ok(res, charts);
    } catch (err) {
      next(err);
    }
  };

  public getActivity = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.activityRepo.listUserActivities(req.user!.id, {
        cursor,
        limit,
      });

      this.ok(res, {
        items: result.items.map(ActivityMapper.toDto),
        nextCursor: result.nextCursor,
      });
    } catch (err) {
      next(err);
    }
  };
}
