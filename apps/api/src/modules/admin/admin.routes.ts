import { Router } from 'express';
import {
  adminAiUsageQuerySchema,
  adminCreateCompanySchema,
  companyLookupRequestSchema,
  adminApplySuggestionsSchema,
  adminAuditLogsQuerySchema,
  adminChangePlanSchema,
  adminChangeStatusSchema,
  adminListCompaniesQuerySchema,
  adminListUsersQuerySchema,
  adminMergeCompanySchema,
  adminUpdateCompanySchema,
} from '@hiretrail/shared';
import { type AdminController } from './controllers/admin.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { requireRole } from '../../core/middleware/guards.middleware';

/** Every route here is ADMIN only; the role is read fresh from the DB by `authenticate`. */
export function createAdminRoutes(controller: AdminController): Router {
  const router = Router();
  router.use(requireRole('ADMIN'));

  router.get('/users', validate({ query: adminListUsersQuerySchema }), controller.listUsers);
  router.get('/users/:id', controller.userDetail);
  router.patch('/users/:id/plan', validate({ body: adminChangePlanSchema }), controller.changePlan);
  router.patch(
    '/users/:id/status',
    validate({ body: adminChangeStatusSchema }),
    controller.changeStatus,
  );

  router.get(
    '/companies',
    validate({ query: adminListCompaniesQuerySchema }),
    controller.listCompanies,
  );
  router.post(
    '/companies/lookup',
    validate({ body: companyLookupRequestSchema }),
    controller.lookupCompany,
  );
  router.post('/companies', validate({ body: adminCreateCompanySchema }), controller.createCompany);
  router.get('/companies/:id', controller.companyDetail);
  router.patch(
    '/companies/:id',
    validate({ body: adminUpdateCompanySchema }),
    controller.updateCompany,
  );
  router.post(
    '/companies/:id/merge',
    validate({ body: adminMergeCompanySchema }),
    controller.mergeCompany,
  );
  router.post(
    '/companies/:id/verifications/:vid/apply',
    validate({ body: adminApplySuggestionsSchema }),
    controller.applyVerification,
  );

  router.get('/audit-logs', validate({ query: adminAuditLogsQuerySchema }), controller.auditLogs);
  router.get('/ai-health', controller.aiHealth);
  router.get('/ai-usage', validate({ query: adminAiUsageQuerySchema }), controller.aiUsage);

  return router;
}
