import React from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { type SkeletonProps } from './Skeleton.types';

export const Skeleton: React.FC<SkeletonProps> = ({
  width,
  height,
  circle = false,
  className,
  style,
  ...props
}) => {
  return (
    <div
      aria-hidden="true"
      className={cn(
        'animate-pulse bg-bg-muted select-none',
        circle ? 'rounded-full' : 'rounded-md',
        className,
      )}
      style={{
        width,
        height,
        ...style,
      }}
      {...props}
    />
  );
};

Skeleton.displayName = 'Skeleton';
