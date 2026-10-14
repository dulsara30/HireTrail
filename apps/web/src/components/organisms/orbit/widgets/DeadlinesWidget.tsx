import React from 'react';
import { Flag } from 'lucide-react';
import { useOrbitTimeline } from '../../../../api/hooks/queries/useOrbitQueries';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import {
  addDays,
  diffLocalDays,
  startOfLocalDay,
} from '../../../../utils/helpers/orbit/orbit-dates';
import { filterEvents, timelineToEvents } from '../../../../utils/helpers/orbit/orbit-events';
import { Spinner } from '../../../atoms/Spinner';
import { EventRow } from '../EventRow';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

const KEY_KINDS = ['DEADLINE', 'INTERVIEW', 'FOLLOW_UP', 'CALL', 'MEETING'];

function countdown(at: Date, now: Date): string {
  const days = diffLocalDays(now, at);
  if (days <= 0) return 'today';
  return days === 1 ? 'tomorrow' : `in ${days} days`;
}

/** The next deadlines, interviews and calls across every application, with a countdown. */
export const DeadlinesWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const filters = useOrbitUiStore((s) => s.filters);
  const { open, toggleDone } = useOrbitActions();
  const start = startOfLocalDay(now);
  const { data, isLoading, isError } = useOrbitTimeline(start, addDays(start, 60));

  const events = React.useMemo(
    () =>
      filterEvents(timelineToEvents(data, now), { ...filters, kinds: [] })
        .filter((e) => KEY_KINDS.includes(e.kind) && e.at.getTime() >= now.getTime() - 3600_000)
        .slice(0, 12),
    [data, now, filters],
  );

  return (
    <WidgetFrame
      title="Deadlines"
      icon={Flag}
      {...frame}
      actions={<span className="text-[11px] text-text-secondary">next 60 days</span>}
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : isError ? (
        <p role="alert" className="text-xs text-text-danger">
          Could not load deadlines.
        </p>
      ) : events.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-text-primary">No deadlines ahead</p>
          <p className="text-xs text-text-secondary">
            Dates you save on applications show up here.
          </p>
        </div>
      ) : (
        <ul>
          {events.map((event) => (
            <EventRow
              key={event.id}
              event={event}
              now={now}
              onOpen={open}
              onToggleDone={toggleDone}
              trailing={
                <span className="flex-shrink-0 rounded-md bg-bg-muted px-1.5 py-0.5 text-[11px] font-semibold text-text-secondary">
                  {countdown(event.at, now)}
                </span>
              }
            />
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
};
