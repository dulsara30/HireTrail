import { type Request, type Response, type NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import {
  type ApplySuggestionsInput,
  type CompanyLookupRequestInput,
  type VerifiableField,
  type VerifyCompanyRequestInput,
} from '@hiretrail/shared';
import { type CompanyVerificationService } from '../services/company-verification.service';
import { type CompanyLookupService } from '../services/company-lookup.service';

export class CompanyAiController extends BaseController {
  constructor(
    private readonly verificationService: CompanyVerificationService,
    private readonly lookupService: CompanyLookupService,
  ) {
    super();
  }

  private actor(req: Request): { id: string; role: 'USER' | 'ADMIN'; plan: 'FREE' | 'PRO' } {
    const user = req.user!;
    return { id: user.id as string, role: user.role as 'USER' | 'ADMIN', plan: user.plan };
  }

  public verify = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.validated?.body ?? req.body ?? {}) as VerifyCompanyRequestInput;
      const result = await this.verificationService.verify(
        this.actor(req),
        String(req.params.id),
        Boolean(body.force),
      );
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public listVerifications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      this.ok(res, await this.verificationService.list(this.actor(req), String(req.params.id)));
    } catch (err) {
      next(err);
    }
  };

  public applySuggestions = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const body = (req.validated?.body ?? req.body) as ApplySuggestionsInput;
      const company = await this.verificationService.applySuggestions(
        this.actor(req),
        String(req.params.id),
        String(req.params.vid),
        body.fields as VerifiableField[],
      );
      this.ok(res, company);
    } catch (err) {
      next(err);
    }
  };

  public lookup = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = (req.validated?.body ?? req.body) as CompanyLookupRequestInput;
      this.ok(res, await this.lookupService.lookup(req.user!.id, body));
    } catch (err) {
      next(err);
    }
  };
}
