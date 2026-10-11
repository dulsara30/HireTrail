import { type HTMLAttributes, type ReactNode } from 'react';
import { type OptionColor } from '@hiretrail/shared';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  color?: OptionColor;
  dot?: boolean;
  children: ReactNode;
}
