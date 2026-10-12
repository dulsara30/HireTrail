import { type ReactNode } from 'react';

export interface FormFieldProps {
  id?: string;
  htmlFor?: string;
  label?: string;
  required?: boolean;
  error?: string;
  helperText?: string;
  caption?: string;
  className?: string;
  children: ReactNode;
}
