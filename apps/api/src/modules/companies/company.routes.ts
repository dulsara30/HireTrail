import { Router } from 'express';
import { CompanyController } from './controllers/company.controller';
import { type CompanyAiController } from './controllers/company-ai.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { requirePlan, requireVerifiedEmail } from '../../core/middleware/guards.middleware';
import {
  createCompanySchema,
  updateCompanySchema,
  listCompaniesQuerySchema,
  searchCompaniesQuerySchema,
  upsertCompanyNotesSchema,
  verifyCompanyRequestSchema,
  applySuggestionsSchema,
  companyLookupRequestSchema,
} from '@hiretrail/shared';

export function createCompanyRoutes(
  controller: CompanyController,
  aiController: CompanyAiController,
): Router {
  const router = Router();

  router.get('/', validate({ query: listCompaniesQuerySchema }), controller.listCompanies);
  router.get('/search', validate({ query: searchCompaniesQuerySchema }), controller.search);
  router.post('/', validate({ body: createCompanySchema }), controller.create);
  router.post(
    '/ai-lookup',
    requirePlan('PRO'),
    requireVerifiedEmail,
    validate({ body: companyLookupRequestSchema }),
    aiController.lookup,
  );
  router.get('/:idOrSlug', controller.getByIdOrSlug);
  router.patch('/:id', validate({ body: updateCompanySchema }), controller.update);
  router.delete('/:id', controller.delete);
  router.put('/:id/my-notes', validate({ body: upsertCompanyNotesSchema }), controller.upsertNotes);
  router.post(
    '/:id/verify',
    requirePlan('PRO'),
    requireVerifiedEmail,
    validate({ body: verifyCompanyRequestSchema }),
    aiController.verify,
  );
  router.get('/:id/verifications', aiController.listVerifications);
  router.post(
    '/:id/verifications/:vid/apply',
    validate({ body: applySuggestionsSchema }),
    aiController.applySuggestions,
  );

  return router;
}
