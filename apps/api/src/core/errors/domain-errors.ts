import { ErrorCode } from '@hiretrail/shared';
import { AppError } from './app-error';

export class ValidationError extends AppError {
  readonly code = ErrorCode.VALIDATION_FAILED;
  readonly status = 400;

  constructor(message = 'Validation failed', details?: unknown) {
    super(message, details);
  }
}

export class InvalidJsonError extends AppError {
  readonly code = ErrorCode.INVALID_JSON;
  readonly status = 400;

  constructor(message = 'Malformed JSON payload', details?: unknown) {
    super(message, details);
  }
}

export class InvalidIdError extends AppError {
  readonly code = ErrorCode.INVALID_ID;
  readonly status = 400;

  constructor(message = 'Invalid resource identifier', details?: unknown) {
    super(message, details);
  }
}

export class UnauthenticatedError extends AppError {
  readonly code = ErrorCode.UNAUTHENTICATED;
  readonly status = 401;

  constructor(message = 'Authentication required', details?: unknown) {
    super(message, details);
  }
}

export class TokenExpiredError extends AppError {
  readonly code = ErrorCode.TOKEN_EXPIRED;
  readonly status = 401;

  constructor(message = 'Access token has expired', details?: unknown) {
    super(message, details);
  }
}

export class InvalidCredentialsError extends AppError {
  readonly code = ErrorCode.INVALID_CREDENTIALS;
  readonly status = 401;

  constructor(message = 'Invalid email or password', details?: unknown) {
    super(message, details);
  }
}

export class SessionRevokedError extends AppError {
  readonly code = ErrorCode.SESSION_REVOKED;
  readonly status = 401;

  constructor(message = 'Session has been revoked', details?: unknown) {
    super(message, details);
  }
}

export class ForbiddenError extends AppError {
  readonly code = ErrorCode.FORBIDDEN;
  readonly status = 403;

  constructor(message = 'Permission denied', details?: unknown) {
    super(message, details);
  }
}

export class PlanRequiredError extends AppError {
  readonly code = ErrorCode.PLAN_REQUIRED;
  readonly status = 403;

  constructor(message = 'PRO subscription required', details?: unknown) {
    super(message, details);
  }
}

export class EmailNotVerifiedError extends AppError {
  readonly code = ErrorCode.EMAIL_NOT_VERIFIED;
  readonly status = 403;

  constructor(message = 'Email verification required', details?: unknown) {
    super(message, details);
  }
}

export class NotFoundError extends AppError {
  readonly code: ErrorCode;
  readonly status = 404;

  constructor(
    code: ErrorCode.NOT_FOUND | ErrorCode.ROUTE_NOT_FOUND = ErrorCode.NOT_FOUND,
    message = 'Resource not found',
    details?: unknown,
  ) {
    super(message, details);
    this.code = code;
  }
}

export class ConflictError extends AppError {
  readonly code = ErrorCode.CONFLICT;
  readonly status = 409;

  constructor(message = 'Resource conflict', details?: unknown) {
    super(message, details);
  }
}

export class DuplicateError extends AppError {
  readonly code = ErrorCode.DUPLICATE;
  readonly status = 409;

  constructor(message = 'Resource already exists', details?: unknown) {
    super(message, details);
  }
}

export class OptionInUseError extends AppError {
  readonly code = ErrorCode.OPTION_IN_USE;
  readonly status = 409;

  constructor(message = 'Option is in use and must be reassigned', details?: unknown) {
    super(message, details);
  }
}

export class LimitReachedError extends AppError {
  readonly code = ErrorCode.LIMIT_REACHED;
  readonly status = 409;

  constructor(message = 'Resource limit reached', details?: unknown) {
    super(message, details);
  }
}

export class RateLimitedError extends AppError {
  readonly code = ErrorCode.RATE_LIMITED;
  readonly status = 429;

  constructor(message = 'Rate limit exceeded', details?: unknown) {
    super(message, details);
  }
}

export class AiQuotaExceededError extends AppError {
  readonly code = ErrorCode.AI_QUOTA_EXCEEDED;
  readonly status = 429;

  constructor(message = 'Daily AI quota exceeded', details?: unknown) {
    super(message, details);
  }
}

export class SourceUnreachableError extends AppError {
  readonly code = ErrorCode.SOURCE_UNREACHABLE;
  readonly status = 400;

  constructor(message = 'Source webpage could not be accessed', details?: unknown) {
    super(message, details);
  }
}

export class UpstreamError extends AppError {
  readonly code = ErrorCode.AI_UNAVAILABLE;
  readonly status = 502;

  constructor(message = 'Upstream service unavailable', details?: unknown) {
    super(message, details);
  }
}

export class InternalError extends AppError {
  readonly code = ErrorCode.INTERNAL_ERROR;
  readonly status = 500;

  constructor(message = 'An unexpected internal error occurred', details?: unknown) {
    super(message, details);
  }
}
