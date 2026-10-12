import React from 'react';
import { Search, X } from 'lucide-react';
import { type OptionDto } from '@hiretrail/shared';
import { useOptions } from '../../../api/hooks/queries/useOptions';
import { Button } from '../../atoms/Button';

export interface PipelineFilterValues {
  q: string;
  priorityId: string;
  workModeId: string;
  sourceId: string;
}

export const EMPTY_PIPELINE_FILTERS: PipelineFilterValues = {
  q: '',
  priorityId: '',
  workModeId: '',
  sourceId: '',
};

export function hasActivePipelineFilters(values: PipelineFilterValues): boolean {
  return Boolean(values.q || values.priorityId || values.workModeId || values.sourceId);
}

interface PipelineFiltersProps {
  values: PipelineFilterValues;
  onChange: (values: PipelineFilterValues) => void;
}

const selectClass =
  'h-9 rounded-md border border-border-default bg-bg-surface px-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent';

/** One search box (role or company) plus filters for the whole board. */
export const PipelineFilters: React.FC<PipelineFiltersProps> = ({ values, onChange }) => {
  const { data } = useOptions();
  const grouped = (data ?? {}) as Record<string, OptionDto[]>;
  const list = (type: string): OptionDto[] => (Array.isArray(grouped[type]) ? grouped[type]! : []);
  const set = (patch: Partial<PipelineFilterValues>) => onChange({ ...values, ...patch });

  const select = (
    label: string,
    all: string,
    field: 'priorityId' | 'workModeId' | 'sourceId',
    options: OptionDto[],
  ) => (
    <select
      aria-label={label}
      value={values[field]}
      onChange={(e) => set({ [field]: e.target.value })}
      className={selectClass}
    >
      <option value="">{all}</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {o.label}
        </option>
      ))}
    </select>
  );

  return (
    <div role="search" className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[14rem] flex-1 sm:max-w-sm">
        <Search
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary"
          aria-hidden="true"
        />
        <input
          value={values.q}
          onChange={(e) => set({ q: e.target.value })}
          aria-label="Search the pipeline by role or company"
          placeholder="Search role or company"
          className="h-9 w-full rounded-md border border-border-default bg-bg-surface pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-border-accent"
        />
      </div>
      {select('Filter by priority', 'All priorities', 'priorityId', list('PRIORITY'))}
      {select('Filter by work mode', 'All work modes', 'workModeId', list('WORK_MODE'))}
      {select('Filter by source', 'All sources', 'sourceId', list('SOURCE'))}
      {hasActivePipelineFilters(values) && (
        <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_PIPELINE_FILTERS)}>
          <X className="h-4 w-4" aria-hidden="true" />
          Clear
        </Button>
      )}
    </div>
  );
};
