import { type Request, type Response, type NextFunction } from 'express';
import { BaseController } from '../../../core/base/base.controller';
import { ValidationError } from '../../../core/errors/domain-errors';
import { type ImportCommitInput, type ListApplicationsQuery } from '@hiretrail/shared';
import { type ApplicationExportService } from '../services/application-export.service';
import { type ApplicationImportService } from '../services/application-import.service';

export class ApplicationDataController extends BaseController {
  constructor(
    private readonly exportService: ApplicationExportService,
    private readonly importService: ApplicationImportService,
  ) {
    super();
  }

  public exportCsv = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const query = (req.validated?.query ?? req.query) as Partial<ListApplicationsQuery>;
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="hiretrail-applications-${stamp}.csv"`,
      );
      res.setHeader('Cache-Control', 'no-store');
      await this.exportService.writeCsv(req.user!.id, query, res);
      res.end();
    } catch (err) {
      // Headers may already be sent while streaming: end the response instead of a JSON error
      if (res.headersSent) {
        res.destroy(err as Error);
        return;
      }
      next(err);
    }
  };

  public importPreview = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = req.body as unknown;
      if (typeof body !== 'string' || body.trim().length === 0) {
        throw new ValidationError('Send the CSV file as text/csv');
      }
      const fileName = String(req.query.fileName ?? 'import.csv').slice(0, 200);
      this.ok(res, await this.importService.preview(req.user!.id, fileName, body));
    } catch (err) {
      next(err);
    }
  };

  public importCommit = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const input = (req.validated?.body ?? req.body) as ImportCommitInput;
      this.ok(res, await this.importService.commit(req.user!.id, input));
    } catch (err) {
      next(err);
    }
  };
}
