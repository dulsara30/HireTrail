import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { ApplicationCommandService } from '../services/application-command.service';
import { ApplicationQueryService } from '../services/application-query.service';
import {
  CreateApplicationInput,
  UpdateApplicationInput,
  MoveApplicationInput,
  ListApplicationsQuery,
  BoardQuery,
} from '@hiretrail/shared';

export class ApplicationController extends BaseController {
  constructor(
    private readonly commandService: ApplicationCommandService,
    private readonly queryService: ApplicationQueryService,
  ) {
    super();
  }

  public getApplications = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const result = await this.queryService.list(
        req.user!.id,
        req.query as unknown as ListApplicationsQuery,
      );
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public getBoard = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.queryService.getBoard(
        req.user!.id,
        req.query as unknown as BoardQuery,
      );
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public getLaneItems = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.queryService.getLaneItems(
        req.user!.id,
        req.params.statusId as string,
        req.query as unknown as import('@hiretrail/shared').LaneQuery,
      );
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const app = await this.queryService.getById(req.user!.id, req.params.id as string);
      this.ok(res, app);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateApplicationInput;
      const result = await this.commandService.create(req.user!.id, input);
      this.created(res, result);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateApplicationInput;
      const result = await this.commandService.update(req.user!.id, req.params.id as string, input);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public move = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as MoveApplicationInput;
      const result = await this.commandService.move(req.user!.id, req.params.id as string, input);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.commandService.archive(req.user!.id, req.params.id as string);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.commandService.restore(req.user!.id, req.params.id as string);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.commandService.delete(req.user!.id, req.params.id as string);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };

  public undoDelete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const result = await this.commandService.undoDelete(req.user!.id, req.params.id as string);
      this.ok(res, result);
    } catch (err) {
      next(err);
    }
  };
}
