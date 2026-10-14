import { Router } from 'express';
import {
  createOrbitSpaceSchema,
  createOrbitTaskSchema,
  listOrbitTasksQuerySchema,
  orbitPulseQuerySchema,
  orbitQuickParseSchema,
  orbitTimelineQuerySchema,
  orbitVersionSchema,
  snoozeOrbitTaskSchema,
  updateOrbitSettingsSchema,
  updateOrbitSpaceSchema,
  updateOrbitTaskSchema,
} from '@hiretrail/shared';
import { validate } from '../../core/middleware/validate.middleware';
import { requirePlan, requireVerifiedEmail } from '../../core/middleware/guards.middleware';
import { type OrbitSpaceController } from './controllers/orbit-space.controller';
import { type OrbitTaskController } from './controllers/orbit-task.controller';

/** Everything under /api/v1/orbit. The caller is already authenticated. */
export function createOrbitRoutes(
  tasks: OrbitTaskController,
  spaces: OrbitSpaceController,
): Router {
  const router = Router();

  router.get('/tasks', validate({ query: listOrbitTasksQuerySchema }), tasks.listTasks);
  router.post('/tasks', validate({ body: createOrbitTaskSchema }), tasks.createTask);
  router.get('/tasks/:id', tasks.getTask);
  router.patch('/tasks/:id', validate({ body: updateOrbitTaskSchema }), tasks.updateTask);
  router.post('/tasks/:id/complete', validate({ body: orbitVersionSchema }), tasks.completeTask);
  router.post('/tasks/:id/reopen', validate({ body: orbitVersionSchema }), tasks.reopenTask);
  router.post('/tasks/:id/snooze', validate({ body: snoozeOrbitTaskSchema }), tasks.snoozeTask);
  router.delete('/tasks/:id', tasks.deleteTask);

  router.get('/timeline', validate({ query: orbitTimelineQuerySchema }), tasks.timeline);
  router.get('/pulse', validate({ query: orbitPulseQuerySchema }), tasks.pulse);
  // The AI refine button: PRO and a verified email, like the other AI features
  router.post(
    '/quick-parse',
    requirePlan('PRO'),
    requireVerifiedEmail,
    validate({ body: orbitQuickParseSchema }),
    tasks.parseText,
  );
  router.get('/due', tasks.due);
  router.get('/plan', tasks.plan);

  router.get('/spaces', spaces.listSpaces);
  router.post('/spaces', validate({ body: createOrbitSpaceSchema }), spaces.createSpace);
  router.patch('/spaces/:id', validate({ body: updateOrbitSpaceSchema }), spaces.updateSpace);
  router.delete('/spaces/:id', spaces.deleteSpace);

  router.get('/settings', spaces.getSettings);
  router.put('/settings', validate({ body: updateOrbitSettingsSchema }), spaces.updateSettings);

  return router;
}
