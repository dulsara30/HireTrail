import React from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';
import { type BadgeProps } from './Badge.types';

export const Badge: React.FC<BadgeProps> = ({
  color = 'neutral',
  dot = false,
  className,
  children,
  ...props
}) => {
  const styles = OPTION_COLOR_STYLES[color] ?? OPTION_COLOR_STYLES.neutral;

  return (
    <span
      className={cn(
        'inline-flex flex-shrink-0 items-center gap-1.5 whitespace-nowrap px-2 py-0.5 rounded-sm text-xs font-medium border select-none',
        styles.bg,
        styles.text,
        styles.border,
        className,
      )}
      {...props}
    >
      {dot && (
        <span
          className={cn('w-1.5 h-1.5 rounded-full', styles.text.replace('text-', 'bg-'))}
          aria-hidden="true"
        />
      )}
      <span className="inline-flex items-center gap-1 whitespace-nowrap">{children}</span>
    </span>
  );
};

Badge.displayName = 'Badge';
