import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { ActivityRepository } from '../repositories/activity.repository';
import { ActivityMapper } from '../mappers/activity.mapper';

export class ActivityController extends BaseController {
  constructor(private readonly activityRepository: ActivityRepository) {
    super();
  }

  public listForApplication = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const type = req.query.type === 'history' ? 'history' : 'all';
      const cursor = typeof req.query.cursor === 'string' ? req.query.cursor : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;

      const result = await this.activityRepository.listForEntity(
        req.user!.id,
        req.params.id as string,
        type,
        cursor,
        limit,
      );

      this.ok(res, {
        items: result.items.map(ActivityMapper.toDto),
        page: {
          nextCursor: result.nextCursor,
          hasMore: result.hasMore,
          limit,
        },
      });
    } catch (err) {
      next(err);
    }
  };
}
