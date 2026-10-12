import { Router, RequestHandler } from 'express';
import { MeController } from './controllers/me.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { updateProfileSchema, changePasswordSchema, deleteAccountSchema } from '@hiretrail/shared';

export function createMeRoutes(controller: MeController, authenticate: RequestHandler): Router {
  const router = Router();

  // All /me routes require authentication
  router.use(authenticate);

  router.get('/', controller.getMe);
  router.patch('/', validate({ body: updateProfileSchema }), controller.updateMe);
  router.patch('/password', validate({ body: changePasswordSchema }), controller.changePassword);
  router.get('/sessions', controller.getSessions);
  router.delete('/sessions/:id', controller.revokeSession);
  router.delete('/', validate({ body: deleteAccountSchema }), controller.deleteAccount);

  return router;
}
