import React from 'react';
import { Check, Lock } from 'lucide-react';
import { ORBIT_KIND_META } from '@hiretrail/shared';
import { ORBIT_KIND_ICONS, orbitKindStyle } from '../../../constants/orbit-ui';
import { cn } from '../../../utils/helpers/class-names';
import { formatWhen } from '../../../utils/helpers/orbit/orbit-dates';
import { type OrbitListItem } from '../../../utils/helpers/orbit/orbit-events';

interface EventRowProps {
  event: OrbitListItem;
  now: Date;
  onOpen: (event: OrbitListItem) => void;
  /** Present for the user's own items. Application dates cannot be ticked off here. */
  onToggleDone?: (event: OrbitListItem) => void;
  /** Extra controls on the right, for example a snooze menu. */
  trailing?: React.ReactNode;
  showWhen?: boolean;
}

/** One line in a list: a coloured kind icon, the title, where it belongs and when it is due. */
export const EventRow: React.FC<EventRowProps> = ({
  event,
  now,
  onOpen,
  onToggleDone,
  trailing,
  showWhen = true,
}) => {
  const style = orbitKindStyle(event.kind);
  const Icon = ORBIT_KIND_ICONS[event.kind];
  const label = ORBIT_KIND_META[event.kind].label;

  return (
    <li className="group flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-bg-muted">
      {event.source === 'task' && onToggleDone ? (
        <button
          type="button"
          onClick={() => onToggleDone(event)}
          aria-label={event.done ? `Reopen ${event.title}` : `Mark ${event.title} as done`}
          className={cn(
            'flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border',
            event.done
              ? 'border-border-default bg-bg-muted text-text-success'
              : `${style.border} bg-bg-surface hover:${style.bg}`,
          )}
        >
          {event.done && <Check className="h-3.5 w-3.5" aria-hidden="true" />}
        </button>
      ) : (
        <span
          title="From an application. Edit it there."
          className="flex h-5 w-5 flex-shrink-0 items-center justify-center text-text-tertiary"
        >
          <Lock className="h-3 w-3" aria-hidden="true" />
        </span>
      )}

      <button
        type="button"
        onClick={() => onOpen(event)}
        className="flex min-w-0 flex-1 items-center gap-2 text-left"
      >
        <span
          className={cn(
            'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md border',
            style.bg,
            style.text,
            style.border,
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          <span className="sr-only">{label}</span>
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block truncate text-sm font-medium',
              event.done ? 'text-text-tertiary line-through' : 'text-text-primary',
            )}
          >
            {event.title}
          </span>
          {(event.context || showWhen) && (
            <span className="block truncate text-[11px] text-text-secondary">
              {showWhen && (
                <span className={event.overdue ? 'font-semibold text-text-danger' : ''}>
                  {formatWhen(event.at, event.allDay, now)}
                </span>
              )}
              {showWhen && event.context ? ' · ' : ''}
              {event.context}
            </span>
          )}
        </span>
      </button>
      {trailing}
    </li>
  );
};
