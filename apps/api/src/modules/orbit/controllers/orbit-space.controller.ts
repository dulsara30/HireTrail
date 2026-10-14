import { Request, Response, NextFunction } from 'express';
import {
  type CreateOrbitSpaceInput,
  type UpdateOrbitSettingsInput,
  type UpdateOrbitSpaceInput,
} from '@hiretrail/shared';
import { BaseController } from '../../../core/base/base.controller';
import { type OrbitActor } from '../services/orbit-task-command.service';
import { type OrbitSpaceService } from '../services/orbit-space.service';
import { type OrbitSettingsService } from '../services/orbit-settings.service';

type Handler = (req: Request, res: Response) => Promise<void>;

export class OrbitSpaceController extends BaseController {
  constructor(
    private readonly spaces: OrbitSpaceService,
    private readonly settings: OrbitSettingsService,
  ) {
    super();
  }

  private actor(req: Request): OrbitActor {
    return { id: req.user!.id as string, plan: req.user!.plan };
  }

  private body<T>(req: Request): T {
    return (req.validated?.body ?? req.body) as T;
  }

  private wrap(fn: Handler) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        await fn(req, res);
      } catch (err) {
        next(err);
      }
    };
  }

  public listSpaces = this.wrap(async (req, res) => {
    this.ok(res, await this.spaces.list(this.actor(req)));
  });

  public createSpace = this.wrap(async (req, res) => {
    this.created(
      res,
      await this.spaces.create(this.actor(req), this.body<CreateOrbitSpaceInput>(req)),
    );
  });

  public updateSpace = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.spaces.update(
        this.actor(req),
        String(req.params.id),
        this.body<UpdateOrbitSpaceInput>(req),
      ),
    );
  });

  public deleteSpace = this.wrap(async (req, res) => {
    await this.spaces.delete(this.actor(req), String(req.params.id));
    this.noContent(res);
  });

  public getSettings = this.wrap(async (req, res) => {
    this.ok(res, await this.settings.get(this.actor(req).id));
  });

  public updateSettings = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.settings.update(this.actor(req), this.body<UpdateOrbitSettingsInput>(req)),
    );
  });
}
