import { Router } from 'express';
import { autofillRequestSchema } from '@hiretrail/shared';
import { type AiController } from './controllers/ai.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { requirePlan, requireVerifiedEmail } from '../../core/middleware/guards.middleware';

export function createAiRoutes(controller: AiController): Router {
  const router = Router();

  router.post(
    '/autofill',
    requirePlan('PRO'),
    requireVerifiedEmail,
    validate({ body: autofillRequestSchema }),
    controller.autofill,
  );
  router.get('/usage', controller.usage);

  return router;
}
