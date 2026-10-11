import { type Request, type Response, type NextFunction } from 'express';
import { type AnyObjectSchema, ValidationError as YupValidationError } from 'yup';
import { ValidationError } from '../errors/domain-errors';

interface ValidationSchemas {
  body?: AnyObjectSchema;
  query?: AnyObjectSchema;
  params?: AnyObjectSchema;
}

export function validate(schemas: ValidationSchemas) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      req.validated = req.validated ?? {};

      if (schemas.body) {
        req.validated.body = await schemas.body.validate(req.body, {
          abortEarly: false,
          stripUnknown: true,
        });
      }

      if (schemas.query) {
        req.validated.query = await schemas.query.validate(req.query, {
          abortEarly: false,
          stripUnknown: true,
        });
      }

      if (schemas.params) {
        req.validated.params = await schemas.params.validate(req.params, {
          abortEarly: false,
          stripUnknown: true,
        });
      }

      next();
    } catch (err) {
      if (err instanceof YupValidationError) {
        const details = err.inner.map((item) => ({
          path: item.path ?? '',
          message: item.message,
        }));
        next(new ValidationError('Validation failed', details));
        return;
      }
      next(err);
    }
  };
}
