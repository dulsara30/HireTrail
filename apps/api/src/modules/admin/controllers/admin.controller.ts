import { type Request, type Response, type NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { hashIp } from '../../../core/security/ip-hash';
import { config } from '../../../config/config';
import {
  type AdminAiUsageQuery,
  type AdminApplySuggestionsInput,
  type AdminAuditLogsQuery,
  type AdminChangePlanInput,
  type AdminChangeStatusInput,
  type AdminListCompaniesQuery,
  type AdminListUsersQuery,
  type AdminMergeCompanyInput,
} from '@hiretrail/shared';
import { type AdminUserService, type AdminActor } from '../services/admin-user.service';
import { type AdminCompanyService } from '../services/admin-company.service';
import { type AdminReportsService } from '../services/admin-reports.service';

type Handler = (req: Request, res: Response, next: NextFunction) => Promise<void>;

export class AdminController extends BaseController {
  constructor(
    private readonly users: AdminUserService,
    private readonly companies: AdminCompanyService,
    private readonly reports: AdminReportsService,
  ) {
    super();
  }

  private actor(req: Request): AdminActor {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    return { id: req.user!.id as string, ipHash: hashIp(ip, config.ipHashSalt) };
  }

  private body<T>(req: Request): T {
    return (req.validated?.body ?? req.body) as T;
  }

  private query<T>(req: Request): T {
    return (req.validated?.query ?? req.query) as T;
  }

  private wrap(fn: (req: Request, res: Response) => Promise<void>): Handler {
    return async (req, res, next) => {
      try {
        await fn(req, res);
      } catch (err) {
        next(err);
      }
    };
  }

  public listUsers = this.wrap(async (req, res) => {
    this.ok(res, await this.users.list(this.query<AdminListUsersQuery>(req)));
  });

  public userDetail = this.wrap(async (req, res) => {
    this.ok(res, await this.users.detail(String(req.params.id)));
  });

  public changePlan = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.users.changePlan(
        this.actor(req),
        String(req.params.id),
        this.body<AdminChangePlanInput>(req),
      ),
    );
  });

  public changeStatus = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.users.changeStatus(
        this.actor(req),
        String(req.params.id),
        this.body<AdminChangeStatusInput>(req),
      ),
    );
  });

  public listCompanies = this.wrap(async (req, res) => {
    this.ok(res, await this.companies.list(this.query<AdminListCompaniesQuery>(req)));
  });

  public mergeCompany = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.companies.merge(
        this.actor(req),
        String(req.params.id),
        this.body<AdminMergeCompanyInput>(req),
      ),
    );
  });

  public applyVerification = this.wrap(async (req, res) => {
    const user = req.user!;
    this.ok(
      res,
      await this.companies.applyVerification(
        { ...this.actor(req), role: user.role, plan: user.plan },
        String(req.params.id),
        String(req.params.vid),
        this.body<AdminApplySuggestionsInput>(req),
      ),
    );
  });

  public auditLogs = this.wrap(async (req, res) => {
    this.ok(res, await this.reports.auditLogs(this.query<AdminAuditLogsQuery>(req)));
  });

  public aiUsage = this.wrap(async (req, res) => {
    this.ok(res, await this.reports.aiUsage(this.query<AdminAiUsageQuery>(req)));
  });
}
