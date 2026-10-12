import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { CompanyService } from '../services/company.service';
import {
  CreateCompanyInput,
  UpdateCompanyInput,
  ListCompaniesQuery,
  UpsertCompanyNotesInput,
} from '@hiretrail/shared';

export class CompanyController extends BaseController {
  constructor(private readonly companyService: CompanyService) {
    super();
  }

  public listCompanies = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validated?.query ?? req.query) as unknown as ListCompaniesQuery;
      const result = await this.companyService.list(req.user!.id, query);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

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

  public getByIdOrSlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const company = await this.companyService.getVisibleByIdOrSlug(
        req.user!.id,
        req.params.idOrSlug as string,
      );
      this.ok(res, company);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateCompanyInput;
      const company = await this.companyService.updatePrivate(
        req.user!.id,
        req.params.id as string,
        input,
      );
      this.ok(res, company);
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.companyService.deletePrivate(req.user!.id, req.params.id as string);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  public upsertNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpsertCompanyNotesInput;
      const notes = await this.companyService.upsertNotes(
        req.user!.id,
        req.params.id as string,
        input,
      );
      this.ok(res, notes);
    } catch (err) {
      next(err);
    }
  };
}
