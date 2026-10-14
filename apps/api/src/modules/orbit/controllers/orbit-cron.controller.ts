import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { type OrbitNotificationService } from '../services/orbit-notification.service';

/** Called by a scheduler (Vercel cron or an external one), never by the web app. */
export class OrbitCronController extends BaseController {
  constructor(private readonly notifications: OrbitNotificationService) {
    super();
  }

  public digest = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, await this.notifications.sendDigests());
    } catch (err) {
      next(err);
    }
  };

  public due = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, await this.notifications.sendDueReminders());
    } catch (err) {
      next(err);
    }
  };
}
