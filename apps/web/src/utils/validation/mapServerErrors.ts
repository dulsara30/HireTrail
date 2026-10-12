import { ApiError } from '../../api/client/api-error';

export function mapServerErrors(
  error: unknown,
  setFieldError: (field: string, message: string) => void,
): string | null {
  if (error instanceof ApiError) {
    if (error.details && typeof error.details === 'object') {
      const details = error.details as Record<string, string>;
      for (const [field, msg] of Object.entries(details)) {
        setFieldError(field, msg);
      }
    }
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}
