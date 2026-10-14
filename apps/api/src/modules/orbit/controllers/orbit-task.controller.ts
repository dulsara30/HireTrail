import { Request, Response, NextFunction } from 'express';
import {
  type CreateOrbitTaskInput,
  type ListOrbitTasksQuery,
  type OrbitPulseQuery,
  type OrbitQuickParseInput,
  type OrbitTimelineQuery,
  type OrbitVersionInput,
  type SnoozeOrbitTaskInput,
  type UpdateOrbitTaskInput,
} from '@hiretrail/shared';
import { BaseController } from '../../../core/base/base.controller';
import {
  type OrbitActor,
  type OrbitTaskCommandService,
} from '../services/orbit-task-command.service';
import { type OrbitTaskQueryService } from '../services/orbit-task-query.service';
import { type OrbitQuickParseService } from '../services/orbit-quick-parse.service';

type Handler = (req: Request, res: Response) => Promise<void>;

export class OrbitTaskController extends BaseController {
  constructor(
    private readonly commands: OrbitTaskCommandService,
    private readonly queries: OrbitTaskQueryService,
    private readonly quickParse: OrbitQuickParseService,
  ) {
    super();
  }

  private actor(req: Request): OrbitActor {
    return { id: req.user!.id as string, plan: req.user!.plan };
  }

  private body<T>(req: Request): T {
    return (req.validated?.body ?? req.body) as T;
  }

  private query<T>(req: Request): T {
    return (req.validated?.query ?? req.query) as T;
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

  public listTasks = this.wrap(async (req, res) => {
    const result = await this.queries.list(
      this.actor(req).id,
      this.query<ListOrbitTasksQuery>(req),
    );
    this.list(res, result.items, result.page);
  });

  public getTask = this.wrap(async (req, res) => {
    this.ok(res, await this.queries.get(this.actor(req).id, String(req.params.id)));
  });

  public createTask = this.wrap(async (req, res) => {
    this.created(
      res,
      await this.commands.create(this.actor(req), this.body<CreateOrbitTaskInput>(req)),
    );
  });

  public updateTask = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.commands.update(
        this.actor(req),
        String(req.params.id),
        this.body<UpdateOrbitTaskInput>(req),
      ),
    );
  });

  public completeTask = this.wrap(async (req, res) => {
    const { version } = this.body<OrbitVersionInput>(req);
    this.ok(res, await this.commands.complete(this.actor(req), String(req.params.id), version));
  });

  public reopenTask = this.wrap(async (req, res) => {
    const { version } = this.body<OrbitVersionInput>(req);
    this.ok(res, await this.commands.reopen(this.actor(req), String(req.params.id), version));
  });

  public snoozeTask = this.wrap(async (req, res) => {
    const input = this.body<SnoozeOrbitTaskInput>(req);
    this.ok(
      res,
      await this.commands.snooze(
        this.actor(req),
        String(req.params.id),
        new Date(input.until),
        input.version,
      ),
    );
  });

  public deleteTask = this.wrap(async (req, res) => {
    await this.commands.delete(this.actor(req), String(req.params.id));
    this.noContent(res);
  });

  public timeline = this.wrap(async (req, res) => {
    const q = this.query<OrbitTimelineQuery>(req);
    this.ok(res, await this.queries.timeline(this.actor(req).id, new Date(q.from), new Date(q.to)));
  });

  public pulse = this.wrap(async (req, res) => {
    const q = this.query<OrbitPulseQuery>(req);
    this.ok(res, await this.queries.pulse(this.actor(req).id, q.tzOffset ?? 0));
  });

  public parseText = this.wrap(async (req, res) => {
    this.ok(
      res,
      await this.quickParse.parse(this.actor(req).id, this.body<OrbitQuickParseInput>(req)),
    );
  });

  public due = this.wrap(async (req, res) => {
    this.ok(res, await this.queries.due(this.actor(req).id));
  });

  public plan = this.wrap(async (req, res) => {
    this.ok(res, await this.queries.plan(this.actor(req)));
  });
}
