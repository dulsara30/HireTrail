import React from 'react';
import { ORBIT_KINDS, ORBIT_KIND_META, type OrbitKind } from '@hiretrail/shared';
import { orbitKindStyle } from '../../../constants/orbit-ui';
import { cn } from '../../../utils/helpers/class-names';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';

interface KindLegendProps {
  /** How many items of each kind are shown, for the small counter. */
  counts?: Partial<Record<OrbitKind, number>>;
  className?: string;
}

/**
 * The colour key. It is also the filter: click a colour to show only that kind (click more to add
 * kinds, click again to remove them).
 */
export const KindLegend: React.FC<KindLegendProps> = ({ counts, className }) => {
  const kinds = useOrbitUiStore((s) => s.filters.kinds);
  const setFilters = useOrbitUiStore((s) => s.setFilters);

  const toggle = (kind: OrbitKind) =>
    setFilters({
      kinds: kinds.includes(kind) ? kinds.filter((k) => k !== kind) : [...kinds, kind],
    });

  return (
    <ul
      className={cn('flex flex-wrap gap-1.5', className)}
      aria-label="Item kinds. Choose to filter."
    >
      {ORBIT_KINDS.map((kind) => {
        const style = orbitKindStyle(kind);
        const active = kinds.length === 0 || kinds.includes(kind);
        const count = counts?.[kind];
        return (
          <li key={kind}>
            <button
              type="button"
              onClick={() => toggle(kind)}
              aria-pressed={kinds.includes(kind)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium transition-opacity',
                style.border,
                active
                  ? `${style.bg} ${style.text}`
                  : 'bg-bg-surface text-text-tertiary opacity-60',
              )}
            >
              <span className={cn('h-2 w-2 rounded-full', style.swatch)} aria-hidden="true" />
              {ORBIT_KIND_META[kind].label}
              {count !== undefined && count > 0 && <span className="opacity-70">{count}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
};
