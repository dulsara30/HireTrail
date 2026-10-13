import { Request, Response, NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { type CompanyNoteService } from '../services/company-note.service';
import { type CreateCompanyNoteInput, type UpdateCompanyNoteInput } from '@hiretrail/shared';

export class CompanyNoteController extends BaseController {
  constructor(private readonly noteService: CompanyNoteService) {
    super();
  }

  public listNotes = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      this.ok(res, await this.noteService.list(req.user!.id, req.params.id as string));
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await this.noteService.create(
        req.user!.id,
        req.params.id as string,
        req.body as CreateCompanyNoteInput,
      );
      this.created(res, note);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const note = await this.noteService.update(
        req.user!.id,
        req.params.noteId as string,
        req.body as UpdateCompanyNoteInput,
      );
      this.ok(res, note);
    } catch (err) {
      next(err);
    }
  };

  public delete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.noteService.delete(req.user!.id, req.params.noteId as string);
      this.noContent(res);
    } catch (err) {
      next(err);
    }
  };
}
