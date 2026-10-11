import { ErrorCode } from './error-codes';

export interface ErrorMetadata {
  status: number;
  message: string;
}

export const ERROR_METADATA: Record<ErrorCode, ErrorMetadata> = {
  [ErrorCode.VALIDATION_FAILED]: {
    status: 400,
    message: 'The request input failed validation.',
  },
  [ErrorCode.INVALID_JSON]: {
    status: 400,
    message: 'Malformed JSON payload.',
  },
  [ErrorCode.INVALID_ID]: {
    status: 400,
    message: 'The requested resource identifier is invalid.',
  },
  [ErrorCode.UNAUTHENTICATED]: {
    status: 401,
    message: 'Authentication credentials are required or invalid.',
  },
  [ErrorCode.TOKEN_EXPIRED]: {
    status: 401,
    message: 'Access token has expired.',
  },
  [ErrorCode.INVALID_CREDENTIALS]: {
    status: 401,
    message: 'Invalid email or password.',
  },
  [ErrorCode.SESSION_REVOKED]: {
    status: 401,
    message: 'The session has been revoked. Please sign in again.',
  },
  [ErrorCode.FORBIDDEN]: {
    status: 403,
    message: 'You do not have permission to perform this action.',
  },
  [ErrorCode.PLAN_REQUIRED]: {
    status: 403,
    message: 'This feature requires a PRO subscription.',
  },
  [ErrorCode.EMAIL_NOT_VERIFIED]: {
    status: 403,
    message: 'Please verify your email address to use this feature.',
  },
  [ErrorCode.NOT_FOUND]: {
    status: 404,
    message: 'The requested resource was not found.',
  },
  [ErrorCode.ROUTE_NOT_FOUND]: {
    status: 404,
    message: 'The requested endpoint does not exist.',
  },
  [ErrorCode.CONFLICT]: {
    status: 409,
    message: 'The resource has been modified by another process.',
  },
  [ErrorCode.DUPLICATE]: {
    status: 409,
    message: 'A resource with this key already exists.',
  },
  [ErrorCode.OPTION_IN_USE]: {
    status: 409,
    message: 'This option is currently in use and must be reassigned.',
  },
  [ErrorCode.LIMIT_REACHED]: {
    status: 409,
    message: 'Resource limit reached.',
  },
  [ErrorCode.RATE_LIMITED]: {
    status: 429,
    message: 'Too many requests. Please try again later.',
  },
  [ErrorCode.AI_QUOTA_EXCEEDED]: {
    status: 429,
    message: 'Daily AI usage quota exceeded.',
  },
  [ErrorCode.SOURCE_UNREACHABLE]: {
    status: 400,
    message: 'The provided job post URL could not be reached.',
  },
  [ErrorCode.AI_UNAVAILABLE]: {
    status: 502,
    message: 'The AI service is temporarily unavailable. Please try again.',
  },
  [ErrorCode.INTERNAL_ERROR]: {
    status: 500,
    message: 'An unexpected internal error occurred.',
  },
};
