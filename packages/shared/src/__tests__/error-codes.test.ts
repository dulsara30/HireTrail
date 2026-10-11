import { describe, it, expect } from 'vitest';
import { ErrorCode } from '../errors/error-codes';
import { ERROR_METADATA } from '../errors/error-meta';

describe('Error Codes and Metadata', () => {
  it('maps every ErrorCode to an HTTP status and message', () => {
    for (const code of Object.values(ErrorCode)) {
      const meta = ERROR_METADATA[code];
      expect(meta).toBeDefined();
      expect(meta.status).toBeGreaterThanOrEqual(400);
      expect(meta.status).toBeLessThan(600);
      expect(typeof meta.message).toBe('string');
      expect(meta.message.length).toBeGreaterThan(0);
    }
  });

  it('matches required status codes for key domain errors', () => {
    expect(ERROR_METADATA[ErrorCode.VALIDATION_FAILED].status).toBe(400);
    expect(ERROR_METADATA[ErrorCode.UNAUTHENTICATED].status).toBe(401);
    expect(ERROR_METADATA[ErrorCode.FORBIDDEN].status).toBe(403);
    expect(ERROR_METADATA[ErrorCode.NOT_FOUND].status).toBe(404);
    expect(ERROR_METADATA[ErrorCode.ROUTE_NOT_FOUND].status).toBe(404);
    expect(ERROR_METADATA[ErrorCode.CONFLICT].status).toBe(409);
    expect(ERROR_METADATA[ErrorCode.RATE_LIMITED].status).toBe(429);
    expect(ERROR_METADATA[ErrorCode.INTERNAL_ERROR].status).toBe(500);
    expect(ERROR_METADATA[ErrorCode.AI_UNAVAILABLE].status).toBe(502);
  });
});
