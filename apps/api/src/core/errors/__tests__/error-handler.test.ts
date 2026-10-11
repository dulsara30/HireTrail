import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express from 'express';
import { ErrorCode } from '@hiretrail/shared';
import { requestIdMiddleware } from '../../middleware/request-id.middleware';
import { errorHandlerMiddleware } from '../../middleware/error-handler.middleware';
import { notFoundMiddleware } from '../../middleware/not-found.middleware';
import { ConflictError, ValidationError } from '../domain-errors';

function createTestApp() {
  const app = express();
  app.use(requestIdMiddleware);
  app.use(express.json());

  app.get('/test-conflict', () => {
    throw new ConflictError('Version mismatch', { currentVersion: 5 });
  });

  app.get('/test-validation', () => {
    throw new ValidationError('Validation failed', [{ path: 'name', message: 'Required' }]);
  });

  app.get('/test-500', () => {
    throw new Error('Unexpected crash');
  });

  app.use(notFoundMiddleware);
  app.use(errorHandlerMiddleware);

  return app;
}

describe('Error Handler Middleware', () => {
  const app = createTestApp();

  it('handles unknown routes with 404 and ROUTE_NOT_FOUND envelope', async () => {
    const res = await request(app).get('/non-existent-route');

    expect(res.status).toBe(404);
    expect(res.headers['x-request-id']).toBeDefined();
    expect(res.body).toEqual({
      error: {
        code: ErrorCode.ROUTE_NOT_FOUND,
        message: 'The requested endpoint does not exist.',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('maps AppError subclasses to their correct status and code with details', async () => {
    const res = await request(app).get('/test-conflict');

    expect(res.status).toBe(409);
    expect(res.body).toEqual({
      error: {
        code: ErrorCode.CONFLICT,
        message: 'Version mismatch',
        requestId: res.headers['x-request-id'],
        details: { currentVersion: 5 },
      },
    });
  });

  it('maps ValidationError to 400 with validation details array', async () => {
    const res = await request(app).get('/test-validation');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe(ErrorCode.VALIDATION_FAILED);
    expect(res.body.error.details).toEqual([{ path: 'name', message: 'Required' }]);
  });

  it('catches unhandled exceptions and returns generic 500 INTERNAL_ERROR', async () => {
    const res = await request(app).get('/test-500');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: {
        code: ErrorCode.INTERNAL_ERROR,
        message: 'An unexpected internal error occurred.',
        requestId: res.headers['x-request-id'],
      },
    });
  });

  it('preserves client x-request-id header if it is a valid UUID', async () => {
    const customId = 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d';
    const res = await request(app).get('/test-conflict').set('x-request-id', customId);

    expect(res.headers['x-request-id']).toBe(customId);
    expect(res.body.error.requestId).toBe(customId);
  });
});
