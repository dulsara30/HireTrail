import React from 'react';
import { Search, X } from 'lucide-react';
import { ORBIT_PRIORITIES } from '@hiretrail/shared';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';
import { hasActiveOrbitFilters } from '../../../utils/helpers/orbit/orbit-events';

/** Search and filters for everything on the board. Press / to jump to the search box. */
export const OrbitFilterBar: React.FC = () => {
  const filters = useOrbitUiStore((s) => s.filters);
  const setFilters = useOrbitUiStore((s) => s.setFilters);
  const resetFilters = useOrbitUiStore((s) => s.resetFilters);
  const ref = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== '/' || event.metaKey || event.ctrlKey) return;
      const el = event.target as HTMLElement;
      if (
        el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        el.isContentEditable
      )
        return;
      event.preventDefault();
      ref.current?.focus();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div
      role="search"
      className="flex flex-wrap items-center gap-2 rounded-xl border border-border-default bg-bg-surface p-2 shadow-sm"
    >
      <div className="relative min-w-[12rem] flex-1">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          ref={ref}
          value={filters.q}
          onChange={(e) => setFilters({ q: e.target.value })}
          aria-label="Search items, companies and tags"
          placeholder="Search items, companies, tags"
          className="h-9 w-full rounded-md border border-border-default bg-bg-surface pl-8 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
        <kbd
          className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border border-border-default px-1 text-[10px] text-text-tertiary sm:block"
          aria-hidden="true"
        >
          /
        </kbd>
      </div>
      <select
        aria-label="Filter by priority"
        value={filters.priority}
        onChange={(e) => setFilters({ priority: e.target.value as typeof filters.priority })}
        className="h-9 rounded-md border border-border-default bg-bg-surface px-2 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
      >
        <option value="">All priorities</option>
        {ORBIT_PRIORITIES.map((p) => (
          <option key={p} value={p}>
            {p.charAt(0) + p.slice(1).toLowerCase()}
          </option>
        ))}
      </select>
      <label className="flex items-center gap-1.5 text-sm text-text-secondary">
        <input
          type="checkbox"
          checked={filters.showDone}
          onChange={(e) => setFilters({ showDone: e.target.checked })}
        />
        Show done
      </label>
      {filters.kinds.length > 0 && (
        <span className="rounded-full bg-bg-accent-subtle px-2 py-0.5 text-xs font-medium text-text-primary">
          {filters.kinds.length} kind{filters.kinds.length === 1 ? '' : 's'} chosen
        </span>
      )}
      {hasActiveOrbitFilters(filters) && (
        <button
          type="button"
          onClick={resetFilters}
          className="flex items-center gap-1 rounded-md px-2 py-1 text-sm font-medium text-text-secondary hover:bg-bg-muted"
        >
          <X className="h-4 w-4" aria-hidden="true" /> Clear
        </button>
      )}
    </div>
  );
};
