import { describe, it, expect } from 'vitest';
import { createSuccessResponse, createListResponse, createErrorResponse } from '../api-response';

describe('ApiResponse Helpers', () => {
  it('shapes success response as { data: T }', () => {
    const res = createSuccessResponse({ id: 'app_1', title: 'Engineer' });
    expect(res).toEqual({
      data: { id: 'app_1', title: 'Engineer' },
    });
  });

  it('shapes list response with data and page envelope', () => {
    const page = { nextCursor: 'cur_abc', hasMore: true, limit: 25 };
    const res = createListResponse([{ id: '1' }], page);

    expect(res).toEqual({
      data: [{ id: '1' }],
      page,
    });
  });

  it('shapes error response with code, message, requestId and optional details', () => {
    const res = createErrorResponse('VALIDATION_FAILED', 'Validation error', 'req-1234', [
      { path: 'title', message: 'Required' },
    ]);

    expect(res).toEqual({
      error: {
        code: 'VALIDATION_FAILED',
        message: 'Validation error',
        requestId: 'req-1234',
        details: [{ path: 'title', message: 'Required' }],
      },
    });
  });
});
