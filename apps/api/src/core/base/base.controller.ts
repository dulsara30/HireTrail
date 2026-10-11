import { type Response } from 'express';
import { type PageInfo } from '@hiretrail/shared';
import { createSuccessResponse, createListResponse } from '../http/api-response';

export abstract class BaseController {
  protected ok<T>(res: Response, data: T, status = 200): Response {
    return res.status(status).json(createSuccessResponse(data));
  }

  protected created<T>(res: Response, data: T): Response {
    return res.status(201).json(createSuccessResponse(data));
  }

  protected noContent(res: Response): Response {
    return res.status(204).send();
  }

  protected list<T>(res: Response, items: T[], page: PageInfo, status = 200): Response {
    return res.status(status).json(createListResponse(items, page));
  }
}
