import React from 'react';
import { Activity, Flame } from 'lucide-react';
import { useOrbitPulse } from '../../../../api/hooks/queries/useOrbitQueries';
import { cn } from '../../../../utils/helpers/class-names';
import { Spinner } from '../../../atoms/Spinner';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

interface StatProps {
  label: string;
  value: React.ReactNode;
  hint?: string;
  tone?: 'default' | 'danger' | 'success';
}

const Stat: React.FC<StatProps> = ({ label, value, hint, tone = 'default' }) => (
  <div className="min-w-0 rounded-lg bg-bg-muted px-3 py-2">
    <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-text-secondary">
      {label}
    </p>
    <p
      className={cn(
        'text-2xl font-bold leading-tight',
        tone === 'danger' && 'text-text-danger',
        tone === 'success' && 'text-text-success',
        tone === 'default' && 'text-text-primary',
      )}
    >
      {value}
    </p>
    {hint && <p className="truncate text-[11px] text-text-secondary">{hint}</p>}
  </div>
);

/** The week in numbers. */
export const PulseWidget: React.FC<WidgetProps> = ({ frame }) => {
  const { data, isLoading, isError } = useOrbitPulse();
  const delta = data ? data.appliedThisWeek - data.appliedLastWeek : 0;

  return (
    <WidgetFrame
      title="Pulse"
      icon={Activity}
      {...frame}
      actions={<span className="text-[11px] text-text-secondary">this week</span>}
    >
      {isLoading ? (
        <div className="flex justify-center py-4">
          <Spinner size="sm" />
        </div>
      ) : isError || !data ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load your numbers.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          <Stat
            label="Applied"
            value={data.appliedThisWeek}
            hint={
              delta === 0 ? 'same as last week' : `${delta > 0 ? '+' : ''}${delta} vs last week`
            }
            tone={delta > 0 ? 'success' : 'default'}
          />
          <Stat label="Done" value={data.doneThisWeek} hint={`${data.openTotal} still open`} />
          <Stat
            label="Overdue"
            value={data.overdue}
            hint={data.dueToday > 0 ? `${data.dueToday} due today` : 'none due today'}
            tone={data.overdue > 0 ? 'danger' : 'default'}
          />
          <Stat
            label="Streak"
            value={
              <span className="inline-flex items-center gap-1">
                {data.streakDays}
                <Flame className="h-5 w-5 text-text-accent" aria-hidden="true" />
              </span>
            }
            hint={
              data.oldestWaitDays !== null ? `oldest wait ${data.oldestWaitDays}d` : 'days in a row'
            }
          />
        </div>
      )}
    </WidgetFrame>
  );
};
