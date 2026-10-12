import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { CompanyService } from '../services/company.service';
import { CreateCompanyInput } from '@hiretrail/shared';

export class CompanyController extends BaseController {
  constructor(private readonly companyService: CompanyService) {
    super();
  }

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateCompanyInput;
      const company = await this.companyService.createPrivate(req.user!.id, input);
      this.created(res, company);
    } catch (err) {
      next(err);
    }
  };

  public search = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const q = typeof req.query.q === 'string' ? req.query.q : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : 20;
      const results = await this.companyService.search(req.user!.id, q, limit);
      this.ok(res, results);
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.getVisibleById(
        req.user!.id,
        req.params.id as string,
      );
      this.ok(res, company);
    } catch (err) {
      next(err);
    }
  };
}
