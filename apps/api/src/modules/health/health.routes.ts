import { Router } from 'express';
import { type HealthController } from './health.controller';

export function createHealthRouter(healthController: HealthController): Router {
  const router = Router();
  router.get('/', healthController.getHealth);
  return router;
}
