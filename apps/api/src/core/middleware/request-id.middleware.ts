import { type Request, type Response, type NextFunction } from 'express';
import { v4 as uuidv4, validate as uuidValidate } from 'uuid';

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
  const headerId = req.headers['x-request-id'];
  const validHeader = typeof headerId === 'string' && uuidValidate(headerId) ? headerId : null;

  const requestId = validHeader ?? uuidv4();

  req.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  next();
}
