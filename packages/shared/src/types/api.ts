export interface PageInfo {
  nextCursor?: string;
  hasMore: boolean;
  limit: number;
}

export interface ApiSuccess<T> {
  data: T;
}

export interface ApiList<T> {
  data: T[];
  page: PageInfo;
}

export interface ApiErrorDetail {
  code: string;
  message: string;
  details?: unknown;
  requestId: string;
}

export interface ApiErrorResponse {
  error: ApiErrorDetail;
}
