import { type HTMLAttributes, type ReactNode } from 'react';
import { type OptionColor } from '@hiretrail/shared';

export interface ChipProps extends HTMLAttributes<HTMLDivElement> {
  color?: OptionColor;
  active?: boolean;
  onRemove?: () => void;
  children: ReactNode;
}
