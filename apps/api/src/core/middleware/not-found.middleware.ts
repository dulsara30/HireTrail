import { type Request, type Response, type NextFunction } from 'express';
import { ErrorCode } from '@hiretrail/shared';
import { NotFoundError } from '../errors/domain-errors';

export function notFoundMiddleware(_req: Request, _res: Response, next: NextFunction): void {
  next(new NotFoundError(ErrorCode.ROUTE_NOT_FOUND, 'The requested endpoint does not exist.'));
}
