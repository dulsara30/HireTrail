import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { CommentService } from '../services/comment.service';
import { CreateCommentInput, UpdateCommentInput } from '@hiretrail/shared';

export class CommentController extends BaseController {
  constructor(private readonly commentService: CommentService) {
    super();
  }

  public listForApplication = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ): Promise<void> => {
    try {
      const comments = await this.commentService.listForApplication(
        req.user!.id,
        req.params.id as string,
      );
      this.ok(res, comments);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as CreateCommentInput;
      const comment = await this.commentService.create(
        req.user!.id,
        req.params.id as string,
        input,
      );
      this.created(res, comment);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = req.body as UpdateCommentInput;
      const comment = await this.commentService.update(
        req.user!.id,
        req.params.id as string,
        input,
      );
      this.ok(res, comment);
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.commentService.delete(req.user!.id, req.params.id as string);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };
}
