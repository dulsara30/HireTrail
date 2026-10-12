import React from 'react';
import { Search, X } from 'lucide-react';
import { type OptionDto } from '@hiretrail/shared';
import { useOptions } from '../../../api/hooks/queries/useOptions';
import { Button } from '../../atoms/Button';
import {
  CompanyFilter,
  type CompanyFilterValue,
} from '../../molecules/CompanyFilter/CompanyFilter';

export interface ApplicationFilterValues {
  q: string;
  statusId: string;
  priorityId: string;
  company: CompanyFilterValue | null;
}

export const EMPTY_APPLICATION_FILTERS: ApplicationFilterValues = {
  q: '',
  statusId: '',
  priorityId: '',
  company: null,
};

export function hasActiveFilters(values: ApplicationFilterValues): boolean {
  return Boolean(values.q || values.statusId || values.priorityId || values.company);
}

interface ApplicationFiltersProps {
  values: ApplicationFilterValues;
  onChange: (values: ApplicationFilterValues) => void;
}

const selectClass =
  'h-10 rounded-md border border-border-default bg-bg-surface px-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

/** Search plus filters for the applications table: company, priority and status. */
export const ApplicationFilters: React.FC<ApplicationFiltersProps> = ({ values, onChange }) => {
  const { data } = useOptions();
  const grouped = (data ?? {}) as Record<string, OptionDto[]>;
  const statuses = Array.isArray(grouped.STATUS) ? grouped.STATUS : [];
  const priorities = Array.isArray(grouped.PRIORITY) ? grouped.PRIORITY : [];
  const set = (patch: Partial<ApplicationFilterValues>) => onChange({ ...values, ...patch });

  return (
    <div
      role="search"
      className="flex flex-col gap-3 rounded-xl border border-border-default bg-bg-surface p-3 shadow-sm md:flex-row md:flex-wrap md:items-center"
    >
      <div className="relative min-w-[14rem] flex-1">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          value={values.q}
          onChange={(e) => set({ q: e.target.value })}
          aria-label="Search applications by role or company"
          placeholder="Search by role or company"
          className="h-10 w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
      </div>

      <CompanyFilter value={values.company} onChange={(company) => set({ company })} />

      <select
        aria-label="Filter by status"
        value={values.statusId}
        onChange={(e) => set({ statusId: e.target.value })}
        className={selectClass}
      >
        <option value="">All statuses</option>
        {statuses.map((s) => (
          <option key={s.id} value={s.id}>
            {s.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Filter by priority"
        value={values.priorityId}
        onChange={(e) => set({ priorityId: e.target.value })}
        className={selectClass}
      >
        <option value="">All priorities</option>
        {priorities.map((p) => (
          <option key={p.id} value={p.id}>
            {p.label}
          </option>
        ))}
      </select>

      {hasActiveFilters(values) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_APPLICATION_FILTERS)}>
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
};
