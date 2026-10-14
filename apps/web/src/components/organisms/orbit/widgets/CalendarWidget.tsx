import React from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { useOrbitTimeline } from '../../../../api/hooks/queries/useOrbitQueries';
import { orbitKindStyle } from '../../../../constants/orbit-ui';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import { cn } from '../../../../utils/helpers/class-names';
import { addDays, startOfLocalDay } from '../../../../utils/helpers/orbit/orbit-dates';
import { filterEvents, timelineToEvents } from '../../../../utils/helpers/orbit/orbit-events';
import { EventRow } from '../EventRow';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const monthName = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;

/** A month with a coloured dot for every item. Choose a day to see it and add to it. */
export const CalendarWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const filters = useOrbitUiStore((s) => s.filters);
  const { open, toggleDone, openNew } = useOrbitActions();
  const [month, setMonth] = React.useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [chosen, setChosen] = React.useState<Date>(() => startOfLocalDay(now));

  const gridStart = addDays(month, -((month.getDay() + 6) % 7));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const { data } = useOrbitTimeline(gridStart, addDays(gridStart, 42));

  const byDay = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof timelineToEvents>>();
    for (const event of filterEvents(timelineToEvents(data, now), { ...filters, showDone: true })) {
      const key = dayKey(event.at);
      map.set(key, [...(map.get(key) ?? []), event]);
    }
    return map;
  }, [data, now, filters]);

  const chosenEvents = byDay.get(dayKey(chosen)) ?? [];
  const shift = (by: number) => setMonth((m) => new Date(m.getFullYear(), m.getMonth() + by, 1));

  return (
    <WidgetFrame
      title="Calendar"
      icon={CalendarDays}
      {...frame}
      actions={
        <>
          <button
            type="button"
            onClick={() => shift(-1)}
            aria-label="Previous month"
            className="rounded p-1 text-text-secondary hover:bg-bg-muted"
          >
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
          <span className="min-w-[7.5rem] text-center text-xs font-semibold text-text-primary">
            {monthName.format(month)}
          </span>
          <button
            type="button"
            onClick={() => shift(1)}
            aria-label="Next month"
            className="rounded p-1 text-text-secondary hover:bg-bg-muted"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </button>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div
          role="grid"
          aria-label={monthName.format(month)}
          className="grid grid-cols-7 gap-px text-center"
        >
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              role="columnheader"
              className="pb-1 text-[10px] font-semibold uppercase text-text-tertiary"
            >
              {d}
            </div>
          ))}
          {days.map((day) => {
            const events = byDay.get(dayKey(day)) ?? [];
            const inMonth = day.getMonth() === month.getMonth();
            const isToday = dayKey(day) === dayKey(now);
            const isChosen = dayKey(day) === dayKey(chosen);
            return (
              <button
                key={day.getTime()}
                type="button"
                role="gridcell"
                onClick={() => setChosen(day)}
                aria-label={`${day.toDateString()}, ${events.length} items`}
                aria-selected={isChosen}
                className={cn(
                  'flex min-h-[2.4rem] flex-col items-center gap-0.5 rounded-md border p-0.5 text-[11px]',
                  isChosen
                    ? 'border-border-accent bg-bg-accent-subtle'
                    : 'border-transparent hover:bg-bg-muted',
                  !inMonth && 'text-text-tertiary',
                  isToday && 'font-bold text-text-accent',
                )}
              >
                {day.getDate()}
                <span className="flex flex-wrap justify-center gap-0.5">
                  {events.slice(0, 4).map((e) => (
                    <span
                      key={e.id}
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        orbitKindStyle(e.kind).swatch,
                        e.done && 'opacity-40',
                      )}
                    />
                  ))}
                  {events.length > 4 && (
                    <span className="text-[9px] leading-none">+{events.length - 4}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>

        <div className="min-h-0 flex-1 overflow-auto border-t border-border-default pt-2">
          <div className="flex items-center justify-between px-1.5">
            <h3 className="text-xs font-semibold text-text-primary">
              {chosen.toLocaleDateString(undefined, {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </h3>
            <button
              type="button"
              onClick={() =>
                openNew({
                  dueAt: new Date(
                    chosen.getFullYear(),
                    chosen.getMonth(),
                    chosen.getDate(),
                    9,
                  ).toISOString(),
                })
              }
              className="flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
            >
              <Plus className="h-3 w-3" aria-hidden="true" /> Add
            </button>
          </div>
          {chosenEvents.length === 0 ? (
            <p className="px-1.5 py-2 text-xs text-text-secondary">Nothing on this day.</p>
          ) : (
            <ul>
              {chosenEvents.map((event) => (
                <EventRow
                  key={event.id}
                  event={event}
                  now={now}
                  onOpen={open}
                  onToggleDone={toggleDone}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
};
