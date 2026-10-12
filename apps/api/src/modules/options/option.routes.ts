import { Router } from 'express';
import { OptionController } from './controllers/option.controller';
import { validate } from '../../core/middleware/validate.middleware';
import {
  createOptionSchema,
  updateOptionSchema,
  moveOptionSchema,
  archiveOptionSchema,
  resetDefaultOptionsSchema,
  listOptionsQuerySchema,
} from '@hiretrail/shared';

export function createOptionRoutes(controller: OptionController): Router {
  const router = Router();

  router.get('/', validate({ query: listOptionsQuerySchema }), controller.getOptions);
  router.post('/', validate({ body: createOptionSchema }), controller.create);
  router.patch('/:id', validate({ body: updateOptionSchema }), controller.update);
  router.post('/:id/move', validate({ body: moveOptionSchema }), controller.move);
  router.post('/:id/archive', validate({ body: archiveOptionSchema }), controller.archive);
  router.post('/:id/restore', controller.restore);
  router.post(
    '/reset-defaults',
    validate({ body: resetDefaultOptionsSchema }),
    controller.resetDefaults,
  );

  return router;
}
