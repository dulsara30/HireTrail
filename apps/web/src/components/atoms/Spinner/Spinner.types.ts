export type SpinnerSize = 'sm' | 'md' | 'lg';
export type SpinnerColor = 'current' | 'accent' | 'inverse';

export interface SpinnerProps {
  size?: SpinnerSize;
  color?: SpinnerColor;
  className?: string;
  label?: string;
}
