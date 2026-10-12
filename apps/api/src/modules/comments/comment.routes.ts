import { Router } from 'express';
import { CommentController } from './controllers/comment.controller';
import { validate } from '../../core/middleware/validate.middleware';
import { updateCommentSchema } from '@hiretrail/shared';

export function createCommentRoutes(controller: CommentController): Router {
  const router = Router();

  router.patch('/:id', validate({ body: updateCommentSchema }), controller.update);
  router.delete('/:id', controller.delete);

  return router;
}
