import React from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { type FormFieldProps } from './FormField.types';

export const FormField: React.FC<FormFieldProps> = ({
  id,
  htmlFor,
  label,
  required = false,
  error,
  helperText,
  caption,
  className,
  children,
}) => {
  const targetId = id || htmlFor;
  const description = helperText || caption;
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={targetId}
          className="text-sm font-medium text-text-primary flex items-center gap-1 select-none"
        >
          <span>{label}</span>
          {required && (
            <span className="text-text-danger" aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}

      <div>{children}</div>

      {error ? (
        <p className="text-xs text-text-danger flex items-center gap-1 mt-0.5" role="alert">
          <span>{error}</span>
        </p>
      ) : description ? (
        <p className="text-xs text-text-secondary mt-0.5">{description}</p>
      ) : null}
    </div>
  );
};

FormField.displayName = 'FormField';
