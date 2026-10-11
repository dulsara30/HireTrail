import { type Request, type Response } from 'express';
import { type HealthDto } from '@hiretrail/shared';
import { BaseController } from '../../core/base/base.controller';
import { pingDatabase } from '../../core/db/connection';

export class HealthController extends BaseController {
  private readonly version = '0.1.0';

  public getHealth = async (_req: Request, res: Response): Promise<Response> => {
    const isDbUp = await pingDatabase();

    const payload: HealthDto = {
      status: isDbUp ? 'ok' : 'degraded',
      db: isDbUp ? 'up' : 'down',
      version: this.version,
    };

    const statusCode = isDbUp ? 200 : 503;
    return this.ok(res, payload, statusCode);
  };
}
