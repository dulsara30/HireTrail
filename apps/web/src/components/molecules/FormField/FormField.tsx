import React from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { type FormFieldProps } from './FormField.types';

export const FormField: React.FC<FormFieldProps> = ({
  id,
  label,
  required = false,
  error,
  helperText,
  className,
  children,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5 w-full', className)}>
      {label && (
        <label
          htmlFor={id}
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
      ) : helperText ? (
        <p className="text-xs text-text-secondary mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};

FormField.displayName = 'FormField';
