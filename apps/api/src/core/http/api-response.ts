import {
  type ApiSuccess,
  type ApiList,
  type ApiErrorResponse,
  type PageInfo,
} from '@hiretrail/shared';

export function createSuccessResponse<T>(data: T): ApiSuccess<T> {
  return { data };
}

export function createListResponse<T>(data: T[], page: PageInfo): ApiList<T> {
  return { data, page };
}

export function createErrorResponse(
  code: string,
  message: string,
  requestId: string,
  details?: unknown,
): ApiErrorResponse {
  const errorObj: ApiErrorResponse['error'] = {
    code,
    message,
    requestId,
  };
  if (details !== undefined) {
    errorObj.details = details;
  }
  return { error: errorObj };
}
