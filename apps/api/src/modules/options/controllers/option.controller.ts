import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { OptionCommandService } from '../services/option-command.service';
import { OptionQueryService } from '../services/option-query.service';
import {
  CreateOptionInput,
  UpdateOptionInput,
  MoveOptionInput,
  ArchiveOptionInput,
  ResetDefaultOptionsInput,
  ListOptionsQuery,
} from '@hiretrail/shared';

export class OptionController extends BaseController {
  constructor(
    private readonly commandService: OptionCommandService,
    private readonly queryService: OptionQueryService,
  ) {
    super();
  }

  public getOptions = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validated?.query ?? req.query) as unknown as ListOptionsQuery;
      const options = await this.queryService.list(req.user!.id, query.type, query.includeArchived);
      this.ok(res, options);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateOptionInput;
      const option = await this.commandService.create(req.user!.id, input);
      this.created(res, option);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateOptionInput;
      const option = await this.commandService.update(req.user!.id, req.params.id as string, input);
      this.ok(res, option);
    } catch (err) {
      next(err);
    }
  };

  public move = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as MoveOptionInput;
      const option = await this.commandService.move(req.user!.id, req.params.id as string, input);
      this.ok(res, option);
    } catch (err) {
      next(err);
    }
  };

  public archive = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ArchiveOptionInput;
      const option = await this.commandService.archive(
        req.user!.id,
        req.params.id as string,
        input,
      );
      this.ok(res, option);
    } catch (err) {
      next(err);
    }
  };

  public restore = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const option = await this.commandService.restore(req.user!.id, req.params.id as string);
      this.ok(res, option);
    } catch (err) {
      next(err);
    }
  };

  public resetDefaults = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as ResetDefaultOptionsInput;
      const options = await this.commandService.resetDefaults(req.user!.id, input);
      this.ok(res, options);
    } catch (err) {
      next(err);
    }
  };
}
