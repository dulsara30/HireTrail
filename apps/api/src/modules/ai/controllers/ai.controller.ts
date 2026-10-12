import { type Request, type Response, type NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { type AutofillRequestInput } from '@hiretrail/shared';
import { type AutofillService } from '../services/autofill.service';
import { type AiQuotaService } from '../services/ai-quota.service';

export class AiController extends BaseController {
  constructor(
    private readonly autofillService: AutofillService,
    private readonly quotaService: AiQuotaService,
  ) {
    super();
  }

  public autofill = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = (req.validated?.body ?? req.body) as AutofillRequestInput;
      this.ok(res, await this.autofillService.autofill(req.user!.id, input));
    } catch (err) {
      next(err);
    }
  };

  public usage = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, await this.quotaService.getUsage(req.user!.id));
    } catch (err) {
      next(err);
    }
  };
}
