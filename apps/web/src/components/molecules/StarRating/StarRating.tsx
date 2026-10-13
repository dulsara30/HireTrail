import React from 'react';
import { Star } from 'lucide-react';
import { cn } from '../../../utils/helpers/class-names';

interface StarRatingProps {
  /** 0 or null means no rating. May be fractional when readOnly (an average). */
  value: number | null;
  onChange?: (value: number | null) => void;
  readOnly?: boolean;
  label: string;
  size?: 'sm' | 'md';
}

/** Five stars. Interactive by default; with `readOnly` it only shows a value (fractions fill partly). */
export const StarRating: React.FC<StarRatingProps> = ({
  value,
  onChange,
  readOnly = false,
  label,
  size = 'md',
}) => {
  const icon = size === 'sm' ? 'h-4 w-4' : 'h-6 w-6';
  const current = value ?? 0;

  return (
    <div className="flex items-center gap-1" role={readOnly ? 'img' : 'group'} aria-label={label}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = current >= star - 0.25;
        const half = !filled && current >= star - 0.75;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => onChange?.(current === star ? null : star)}
            aria-label={`${star} star${star === 1 ? '' : 's'}`}
            aria-pressed={!readOnly ? current >= star : undefined}
            className={cn(
              'relative rounded p-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-border-accent',
              readOnly ? 'cursor-default' : 'hover:scale-110',
            )}
          >
            <Star className={cn(icon, 'text-border-default')} aria-hidden="true" />
            {(filled || half) && (
              <span
                className="absolute inset-0 flex items-center overflow-hidden p-0.5"
                style={{ width: filled ? '100%' : '50%' }}
              >
                <Star className={cn(icon, 'flex-shrink-0 fill-bg-accent text-bg-accent')} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};
