import { type Request, type Response, type NextFunction } from 'express';
import mongoose from 'mongoose';
import { ErrorCode } from '@hiretrail/shared';
import { AppError } from '../errors/app-error';
import { createErrorResponse } from '../http/api-response';
import { logger } from '../logger/logger';

interface MongoDuplicateKeyError {
  code: number;
  keyValue?: Record<string, unknown>;
}

export function errorHandlerMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.headersSent) {
    return next(err);
  }

  const requestId = req.requestId || 'unknown-request-id';

  // 1. AppError subclasses
  if (err instanceof AppError) {
    res.status(err.status).json(createErrorResponse(err.code, err.message, requestId, err.details));
    return;
  }

  // 2. SyntaxError for malformed JSON from body-parser
  if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    res
      .status(400)
      .json(createErrorResponse(ErrorCode.INVALID_JSON, 'Malformed JSON payload', requestId));
    return;
  }

  // Body parser: payload over the limit (for example a CSV above 1 MB)
  if ((err as { type?: string })?.type === 'entity.too.large') {
    res
      .status(413)
      .json(
        createErrorResponse(
          ErrorCode.VALIDATION_FAILED,
          'The file is too large (max 1 MB)',
          requestId,
        ),
      );
    return;
  }

  // 3. Mongoose ValidationError
  if (err instanceof mongoose.Error.ValidationError) {
    const details = Object.values(err.errors).map((item) => ({
      path: (item as mongoose.Error.ValidatorError).path,
      message: (item as mongoose.Error.ValidatorError).message,
    }));
    res
      .status(400)
      .json(
        createErrorResponse(ErrorCode.VALIDATION_FAILED, 'Validation failed', requestId, details),
      );
    return;
  }

  // 4. Mongoose CastError (e.g. invalid ObjectId)
  if (err instanceof mongoose.Error.CastError) {
    res
      .status(400)
      .json(
        createErrorResponse(
          ErrorCode.INVALID_ID,
          `Invalid identifier for path: ${(err as mongoose.Error.CastError).path}`,
          requestId,
        ),
      );
    return;
  }

  // 5. MongoDB Duplicate Key (E11000)
  if (
    err &&
    typeof err === 'object' &&
    'code' in err &&
    (err as MongoDuplicateKeyError).code === 11000
  ) {
    const mongoErr = err as MongoDuplicateKeyError;
    res
      .status(409)
      .json(
        createErrorResponse(
          ErrorCode.DUPLICATE,
          'A record with this unique value already exists.',
          requestId,
          mongoErr.keyValue,
        ),
      );
    return;
  }

  // 6. Unexpected error (500 INTERNAL_ERROR)
  logger.error(
    {
      err,
      requestId,
      method: req.method,
      url: req.originalUrl || req.url,
    },
    'Unhandled server error occurred',
  );

  res
    .status(500)
    .json(
      createErrorResponse(
        ErrorCode.INTERNAL_ERROR,
        'An unexpected internal error occurred.',
        requestId,
      ),
    );
}
