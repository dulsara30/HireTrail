import { Router } from 'express';
import { CompanyController } from './controllers/company.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { createCompanySchema, searchCompaniesQuerySchema } from '@hiretrail/shared';

export function createCompanyRoutes(controller: CompanyController): Router {
  const router = Router();

  router.get('/', validate({ query: searchCompaniesQuerySchema }), controller.search);
  router.post('/', validate({ body: createCompanySchema }), controller.create);
  router.get('/:id', controller.getById);

  return router;
}
