import React from 'react';
import { ChevronLeft, ChevronRight, Lock, Orbit } from 'lucide-react';
import {
  ORBIT_KIND_META,
  ORBIT_ZOOM_DAYS,
  type OrbitKind,
  type OrbitZoomDays,
} from '@hiretrail/shared';
import { useOrbitPlan, useOrbitTimeline } from '../../../../api/hooks/queries/useOrbitQueries';
import { orbitKindStyle } from '../../../../constants/orbit-ui';
import { useElementSize } from '../../../../hooks/useElementSize';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import { cn } from '../../../../utils/helpers/class-names';
import {
  addDays,
  formatWhen,
  fromLocalInput,
  startOfLocalDay,
  toDateInput,
} from '../../../../utils/helpers/orbit/orbit-dates';
import {
  filterEvents,
  timelineToEvents,
  type OrbitEvent,
} from '../../../../utils/helpers/orbit/orbit-events';
import {
  daysForRing,
  layoutRadar,
  type RadarPoint,
} from '../../../../utils/helpers/orbit/orbit-geometry';
import { KindBadge } from '../../../molecules/KindBadge';
import { KindLegend } from '../KindLegend';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

const RING_FRACTIONS = [0.25, 0.5, 0.75, 1];

function ringLabel(days: number): string {
  if (days < 1.5) return '1 day';
  if (days < 14) return `${Math.round(days)} days`;
  if (days < 60) return `${Math.round(days / 7)} wks`;
  return `${Math.round(days / 30)} mo`;
}

/** Everything with a date on a radar. Closer to the middle means closer in time to the chosen day. */
export const OrbitRadarWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const referenceDate = useOrbitUiStore((s) => s.referenceDate);
  const setReferenceDate = useOrbitUiStore((s) => s.setReferenceDate);
  const zoom = useOrbitUiStore((s) => s.zoom);
  const setZoom = useOrbitUiStore((s) => s.setZoom);
  const filters = useOrbitUiStore((s) => s.filters);
  const select = useOrbitUiStore((s) => s.select);
  const { data: plan } = useOrbitPlan();
  const maxZoom = plan?.limits.maxZoomDays ?? 14;

  // The middle of the chosen day, or right now when looking at today
  const picked = referenceDate ? fromLocalInput(referenceDate) : null;
  const center = picked
    ? new Date(picked.getFullYear(), picked.getMonth(), picked.getDate(), 12)
    : now;

  const from = startOfLocalDay(addDays(center, -zoom - 1));
  const to = startOfLocalDay(addDays(center, zoom + 2));
  const { data, isLoading, isError } = useOrbitTimeline(from, to);

  const allEvents = React.useMemo(() => timelineToEvents(data, now), [data, now]);
  const events = React.useMemo(() => filterEvents(allEvents, filters), [allEvents, filters]);
  const counts = React.useMemo(() => {
    const out: Partial<Record<OrbitKind, number>> = {};
    for (const e of filterEvents(allEvents, { ...filters, kinds: [] }))
      out[e.kind] = (out[e.kind] ?? 0) + 1;
    return out;
  }, [allEvents, filters]);

  const [sizeRef, size] = useElementSize<HTMLDivElement>();
  const width = Math.max(size.width, 240);
  const height = Math.max(size.height, 220);
  const radius = Math.max(Math.min(width / 2, height / 2) - 26, 60);
  const mid = { x: width / 2, y: height / 2 };
  const layout = React.useMemo(
    () => layoutRadar(events, center, zoom, radius, mid),
    [events, center, zoom, radius, mid.x, mid.y],
  );

  const [hover, setHover] = React.useState<RadarPoint | null>(null);
  const open = (event: OrbitEvent) =>
    select(
      event.source === 'task' && event.task
        ? { type: 'task', id: event.task.id }
        : { type: 'application', event: event.application! },
    );

  const label = referenceDate ? formatWhen(startOfLocalDay(center), true, now) : 'Today';
  const step = (days: number) =>
    setReferenceDate(
      toDateInput(
        addDays(
          referenceDate ? (fromLocalInput(referenceDate) as Date) : startOfLocalDay(now),
          days,
        ),
      ),
    );

  return (
    <WidgetFrame
      title="Orbit"
      icon={Orbit}
      {...frame}
      actions={
        <>
          <div className="flex items-center rounded-md border border-border-default">
            <button
              type="button"
              onClick={() => step(-1)}
              aria-label="One day earlier"
              className="p-1 text-text-secondary hover:bg-bg-muted"
            >
              <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
            <input
              type="date"
              aria-label="Centre the radar on this day"
              value={referenceDate ?? toDateInput(now)}
              onChange={(e) => setReferenceDate(e.target.value || null)}
              className="w-[7.5rem] border-x border-border-default bg-transparent px-1 py-0.5 text-[11px]"
            />
            <button
              type="button"
              onClick={() => step(1)}
              aria-label="One day later"
              className="p-1 text-text-secondary hover:bg-bg-muted"
            >
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => setReferenceDate(null)}
            disabled={!referenceDate}
            className="rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted disabled:opacity-50"
          >
            Today
          </button>
          <div
            role="group"
            aria-label="How far the radar looks"
            className="flex rounded-md border border-border-default"
          >
            {ORBIT_ZOOM_DAYS.map((days) => {
              const locked = days > maxZoom;
              return (
                <button
                  key={days}
                  type="button"
                  onClick={() => !locked && setZoom(days as OrbitZoomDays)}
                  aria-pressed={zoom === days}
                  title={locked ? 'Longer ranges are a PRO feature' : `${days} days either side`}
                  className={cn(
                    'flex items-center gap-0.5 px-1.5 py-0.5 text-[11px] font-medium',
                    zoom === days
                      ? 'bg-bg-accent text-text-primary'
                      : 'text-text-secondary hover:bg-bg-muted',
                    locked && 'cursor-not-allowed opacity-50',
                  )}
                >
                  {days}d{locked && <Lock className="h-2.5 w-2.5" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </>
      }
    >
      <div className="flex h-full min-h-0 flex-col gap-2">
        <div ref={sizeRef} className="relative min-h-[200px] flex-1">
          <svg
            width={width}
            height={height}
            viewBox={`0 0 ${width} ${height}`}
            role="group"
            aria-label={`Radar of ${layout.points.length} items around ${label}`}
            className="absolute inset-0"
          >
            <g fill="none" className="stroke-border-default">
              {RING_FRACTIONS.map((f) => (
                <circle
                  key={f}
                  cx={mid.x}
                  cy={mid.y}
                  r={radius * f}
                  strokeDasharray={f === 1 ? undefined : '3 4'}
                />
              ))}
              <line
                x1={mid.x - radius}
                y1={mid.y}
                x2={mid.x + radius}
                y2={mid.y}
                strokeDasharray="2 5"
              />
              <line
                x1={mid.x}
                y1={mid.y - radius}
                x2={mid.x}
                y2={mid.y + radius}
                strokeDasharray="2 5"
              />
            </g>
            <g className="motion-reduce:hidden" aria-hidden="true">
              <line
                x1={mid.x}
                y1={mid.y}
                x2={mid.x + radius}
                y2={mid.y}
                strokeWidth={1.5}
                className="stroke-border-accent motion-safe:animate-[spin_16s_linear_infinite]"
                style={{ transformOrigin: `${mid.x}px ${mid.y}px`, opacity: 0.55 }}
              />
            </g>
            <g className="fill-text-tertiary text-[10px]" aria-hidden="true">
              {RING_FRACTIONS.map((f) => (
                <text key={f} x={mid.x + 3} y={mid.y - radius * f - 3}>
                  {ringLabel(daysForRing(f, zoom))}
                </text>
              ))}
              <text x={mid.x - radius} y={mid.y + radius + 14} textAnchor="start">
                Earlier
              </text>
              <text x={mid.x + radius} y={mid.y + radius + 14} textAnchor="end">
                Later
              </text>
            </g>
            <circle cx={mid.x} cy={mid.y} r={5} className="fill-bg-accent" />
            <text
              x={mid.x}
              y={mid.y + 17}
              textAnchor="middle"
              className="fill-text-secondary text-[10px] font-semibold"
            >
              {label}
            </text>

            {layout.points.map((point) => {
              const { event } = point;
              const style = orbitKindStyle(event.kind);
              const size = event.priority === 'HIGH' ? 8 : 6.5;
              const description = `${ORBIT_KIND_META[event.kind].label}: ${event.title}, ${formatWhen(event.at, event.allDay, now)}${event.overdue ? ', overdue' : ''}`;
              return (
                <g
                  key={event.id}
                  tabIndex={0}
                  role="button"
                  aria-label={description}
                  onMouseEnter={() => setHover(point)}
                  onMouseLeave={() => setHover(null)}
                  onFocus={() => setHover(point)}
                  onBlur={() => setHover(null)}
                  onClick={() => open(event)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      open(event);
                    }
                  }}
                  className={cn(
                    'cursor-pointer outline-none',
                    event.done && 'opacity-40',
                    style.text,
                  )}
                >
                  <circle cx={point.x} cy={point.y} r={size + 7} className="fill-transparent" />
                  {event.overdue && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={size + 3.5}
                      fill="none"
                      strokeWidth={1.5}
                      className="stroke-text-danger motion-safe:animate-pulse"
                    />
                  )}
                  {event.source === 'application' ? (
                    <rect
                      x={point.x - size}
                      y={point.y - size}
                      width={size * 2}
                      height={size * 2}
                      transform={`rotate(45 ${point.x} ${point.y})`}
                      className="fill-current"
                    />
                  ) : (
                    <circle cx={point.x} cy={point.y} r={size} className="fill-current" />
                  )}
                  {hover?.event.id === event.id && (
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={size + 4}
                      fill="none"
                      strokeWidth={2}
                      className="stroke-border-focus"
                    />
                  )}
                </g>
              );
            })}
          </svg>

          {hover && (
            <div
              role="tooltip"
              className="pointer-events-none absolute z-10 max-w-[14rem] space-y-1 rounded-lg border border-border-default bg-bg-surface p-2 text-xs shadow-md"
              style={{
                left: Math.min(Math.max(hover.x + 12, 4), Math.max(width - 224, 4)),
                top: Math.min(Math.max(hover.y - 8, 4), Math.max(height - 80, 4)),
              }}
            >
              <KindBadge kind={hover.event.kind} />
              <p className="font-semibold text-text-primary">{hover.event.title}</p>
              <p className="text-text-secondary">
                {formatWhen(hover.event.at, hover.event.allDay, now)}
                {hover.event.context ? ` · ${hover.event.context}` : ''}
              </p>
              {hover.event.overdue && <p className="font-semibold text-text-danger">Overdue</p>}
              <p className="text-text-tertiary">Click to open</p>
            </div>
          )}

          {!isLoading && !isError && layout.points.length === 0 && (
            <p className="absolute inset-x-0 top-[58%] text-center text-xs text-text-secondary">
              Nothing in this range. Add something with the bar above.
            </p>
          )}
          {isError && (
            <p
              role="alert"
              className="absolute inset-x-0 top-[58%] text-center text-xs text-text-danger"
            >
              Could not load the radar.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2">
          <KindLegend counts={counts} />
          {layout.hidden > 0 && (
            <span className="text-[11px] text-text-tertiary">
              {layout.hidden} more outside {zoom} days
            </span>
          )}
        </div>
      </div>
    </WidgetFrame>
  );
};
