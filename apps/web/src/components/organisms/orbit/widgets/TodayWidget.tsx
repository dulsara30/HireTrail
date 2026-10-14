import React from 'react';
import { Plus, Sun } from 'lucide-react';
import { useOrbitTimeline } from '../../../../api/hooks/queries/useOrbitQueries';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import { addDays, startOfLocalDay } from '../../../../utils/helpers/orbit/orbit-dates';
import { filterEvents, timelineToEvents } from '../../../../utils/helpers/orbit/orbit-events';
import { Spinner } from '../../../atoms/Spinner';
import { EventRow } from '../EventRow';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

const time = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

/** Today as a river: what is already behind you, the "now" line, and what is still ahead. */
export const TodayWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const filters = useOrbitUiStore((s) => s.filters);
  const { open, toggleDone, openNew } = useOrbitActions();
  const start = startOfLocalDay(now);
  const { data, isLoading, isError } = useOrbitTimeline(start, addDays(start, 1));

  const events = React.useMemo(
    () => filterEvents(timelineToEvents(data, now), { ...filters, showDone: true }),
    [data, now, filters],
  );
  const dated = events.filter((e) => !e.allDay);
  const allDay = events.filter((e) => e.allDay);
  const before = dated.filter((e) => e.at.getTime() <= now.getTime());
  const after = dated.filter((e) => e.at.getTime() > now.getTime());

  const row = (event: (typeof events)[number]) => (
    <div key={event.id} className="flex items-start gap-2">
      <span className="w-11 flex-shrink-0 pt-2.5 text-right text-[11px] tabular-nums text-text-secondary">
        {event.allDay ? 'All day' : time.format(event.at)}
      </span>
      <ul className="min-w-0 flex-1 border-l-2 border-border-default pl-2">
        <EventRow
          event={event}
          now={now}
          onOpen={open}
          onToggleDone={toggleDone}
          showWhen={false}
        />
      </ul>
    </div>
  );

  return (
    <WidgetFrame
      title="Today"
      icon={Sun}
      {...frame}
      actions={
        <button
          type="button"
          onClick={() => openNew({ dueAt: new Date(now.getTime() + 3600_000).toISOString() })}
          className="flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Add
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load today.
        </p>
      ) : events.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-text-primary">A clear day</p>
          <p className="text-xs text-text-secondary">Nothing is planned for today.</p>
        </div>
      ) : (
        <div className="space-y-1">
          {allDay.map(row)}
          {before.map(row)}
          <div className="flex items-center gap-2" aria-label={`Now, ${time.format(now)}`}>
            <span className="w-11 text-right text-[11px] font-semibold tabular-nums text-text-accent">
              {time.format(now)}
            </span>
            <span className="h-px flex-1 bg-bg-accent" />
          </div>
          {after.map(row)}
        </div>
      )}
    </WidgetFrame>
  );
};
