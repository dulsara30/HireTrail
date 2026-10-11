import { type ApiErrorDetail, type ApiErrorResponse } from '@hiretrail/shared';
import { AxiosError } from 'axios';

export class ApiError extends Error {
  public readonly code: string;
  public readonly details?: unknown;
  public readonly requestId?: string;
  public readonly status?: number;

  constructor(detail: ApiErrorDetail, status?: number) {
    super(detail.message);
    this.name = 'ApiError';
    this.code = detail.code;
    this.details = detail.details;
    this.requestId = detail.requestId;
    this.status = status;
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  public static fromAxiosError(error: AxiosError<ApiErrorResponse>): ApiError {
    const errorBody = error.response?.data?.error;
    if (errorBody) {
      return new ApiError(errorBody, error.response?.status);
    }

    return new ApiError(
      {
        code: 'NETWORK_ERROR',
        message: error.message || 'A network error occurred.',
        requestId: (error.response?.headers?.['x-request-id'] as string) || 'unknown',
      },
      error.response?.status,
    );
  }
}
