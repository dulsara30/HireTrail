import React, { forwardRef } from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { type InputProps } from './Input.types';

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ hasError = false, className, disabled, ...props }, ref) => {
    return (
      <input
        ref={ref}
        disabled={disabled}
        className={cn(
          'w-full h-10 px-3 py-2 text-sm rounded-md bg-bg-surface text-text-primary border transition-colors',
          'placeholder:text-text-tertiary',
          'focus:outline-none focus:ring-1',
          hasError
            ? 'border-border-danger focus:border-border-danger focus:ring-border-danger'
            : 'border-border-default focus:border-border-accent focus:ring-border-accent',
          'disabled:bg-bg-disabled disabled:text-text-disabled disabled:cursor-not-allowed',
          className,
        )}
        {...props}
      />
    );
  },
);

Input.displayName = 'Input';
