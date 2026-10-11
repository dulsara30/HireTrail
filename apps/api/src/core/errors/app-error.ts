import { ErrorCode, ERROR_METADATA } from '@hiretrail/shared';

export abstract class AppError extends Error {
  abstract readonly code: ErrorCode;
  abstract readonly status: number;

  constructor(
    message?: string,
    public readonly details?: unknown,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    Error.captureStackTrace(this, this.constructor);
  }

  getDefaultMessage(): string {
    return ERROR_METADATA[this.code]?.message ?? 'An error occurred';
  }
}
