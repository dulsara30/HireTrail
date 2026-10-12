import express, { Router } from 'express';
import { ApplicationDataController } from './controllers/application-data.controller';
import { ApplicationController } from './controllers/application.controller';
import { CommentController } from '../comments/controllers/comment.controller';
import { ActivityController } from '../activities/controllers/activity.controller';
import { validate } from '../../core/middleware/validate.middleware';
import {
  createApplicationSchema,
  updateApplicationSchema,
  moveApplicationSchema,
  listApplicationsQuerySchema,
  boardQuerySchema,
  laneQuerySchema,
  createCommentSchema,
  importCommitSchema,
} from '@hiretrail/shared';

export function createApplicationRoutes(
  appController: ApplicationController,
  commentController: CommentController,
  activityController: ActivityController,
  dataController: ApplicationDataController,
): Router {
  const router = Router();

  // Board routes (declared before /:id)
  router.get('/board', validate({ query: boardQuerySchema }), appController.getBoard);
  router.get(
    '/board/lane/:statusId',
    validate({ query: laneQuerySchema }),
    appController.getLaneItems,
  );

  // Export / import (declared before /:id). Import takes the raw CSV text, max 1 MB.
  router.get('/export', validate({ query: listApplicationsQuerySchema }), dataController.exportCsv);
  router.post(
    '/import/preview',
    express.text({ type: ['text/csv', 'text/plain'], limit: '1mb' }),
    dataController.importPreview,
  );
  router.post(
    '/import/commit',
    validate({ body: importCommitSchema }),
    dataController.importCommit,
  );

  // Table & general listing
  router.get('/', validate({ query: listApplicationsQuerySchema }), appController.getApplications);
  router.post('/', validate({ body: createApplicationSchema }), appController.create);

  // Single application operations
  router.get('/:id', appController.getById);
  router.patch('/:id', validate({ body: updateApplicationSchema }), appController.update);
  router.post('/:id/move', validate({ body: moveApplicationSchema }), appController.move);
  router.post('/:id/archive', appController.archive);
  router.post('/:id/restore', appController.restore);
  router.delete('/:id', appController.delete);
  router.post('/:id/undo-delete', appController.undoDelete);

  // Comments & activity nested under application
  router.get('/:id/comments', commentController.listForApplication);
  router.post('/:id/comments', validate({ body: createCommentSchema }), commentController.create);
  router.get('/:id/activities', activityController.listForApplication);

  return router;
}
