import { Router } from 'express';
import { DashboardController } from './controllers/dashboard.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { requirePlan, requireVerifiedEmail } from '../../core/middleware/guards.middleware';
import {
  dashboardSummaryQuerySchema,
  dashboardChartsQuerySchema,
  cursorPaginationSchema,
} from '@hiretrail/shared';

export function createDashboardRoutes(controller: DashboardController): Router {
  const router = Router();

  router.get('/summary', validate({ query: dashboardSummaryQuerySchema }), controller.getSummary);
  router.get('/charts', validate({ query: dashboardChartsQuerySchema }), controller.getCharts);
  router.get('/activity', validate({ query: cursorPaginationSchema }), controller.getActivity);

  router.get('/insights', requirePlan('PRO'), controller.getInsights);
  router.post(
    '/insights/refresh',
    requirePlan('PRO'),
    requireVerifiedEmail,
    controller.refreshInsights,
  );

  return router;
}
