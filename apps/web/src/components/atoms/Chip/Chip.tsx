import React from 'react';
import { cn } from '../../../utils/helpers/class-names';
import { OPTION_COLOR_STYLES } from '../../../constants/option-colors';
import { type ChipProps } from './Chip.types';

export const Chip: React.FC<ChipProps> = ({
  color = 'neutral',
  active = false,
  onRemove,
  className,
  onClick,
  children,
  ...props
}) => {
  const styles = OPTION_COLOR_STYLES[color] ?? OPTION_COLOR_STYLES.neutral;

  return (
    <div
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors select-none',
        styles.bg,
        styles.text,
        styles.border,
        active && 'ring-2 ring-border-accent',
        onClick && 'cursor-pointer hover:opacity-80',
        className,
      )}
      {...props}
    >
      <span>{children}</span>
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 inline-flex items-center justify-center hover:opacity-75 focus:outline-none cursor-pointer"
          aria-label="Remove"
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </div>
  );
};

Chip.displayName = 'Chip';
