import React from 'react';
import { useRouter } from 'next/navigation';
import { BellRing, Check, X } from 'lucide-react';
import {
  useCompleteOrbitTask,
  useSnoozeOrbitTask,
} from '../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitDue, useOrbitTimeline } from '../../../api/hooks/queries/useOrbitQueries';
import { ROUTES } from '../../../constants/routes';
import { useNow } from '../../../hooks/useNow';
import { useOrbitUiStore } from '../../../store/orbit-ui.store';
import {
  desktopAlertState,
  disableDesktopAlerts,
  enableDesktopAlerts,
  type DesktopAlertState,
} from '../../../utils/helpers/orbit/desktop-alerts';
import { addDays, startOfLocalDay } from '../../../utils/helpers/orbit/orbit-dates';
import {
  taskToListItem,
  timelineToEvents,
  type OrbitListItem,
} from '../../../utils/helpers/orbit/orbit-events';
import { Button } from '../../atoms/Button';
import { Spinner } from '../../atoms/Spinner';
import { EventRow } from './EventRow';
import { SnoozeMenu } from './SnoozeMenu';

interface NotificationCenterProps {
  onClose: () => void;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Everything that needs you, in one place: what is due or overdue now, and what is coming in the
 * next 24 hours. Mark things done or snooze them from here, or open them on Orbit.
 */
export const NotificationCenter: React.FC<NotificationCenterProps> = ({ onClose }) => {
  const router = useRouter();
  const now = useNow();
  const select = useOrbitUiStore((s) => s.select);
  const { data: due, isLoading, isError } = useOrbitDue();
  const upcoming = useOrbitTimeline(startOfLocalDay(now), addDays(startOfLocalDay(now), 2));
  const complete = useCompleteOrbitTask();
  const snooze = useSnoozeOrbitTask();
  const [alerts, setAlerts] = React.useState<DesktopAlertState>('off');

  React.useEffect(() => setAlerts(desktopAlertState()), []);
  React.useEffect(() => {
    const esc = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose]);

  const dueItems = React.useMemo(
    () => (due?.due ?? []).map((task) => taskToListItem(task, now)),
    [due, now],
  );
  const dueIds = new Set(dueItems.map((i) => i.id));
  const soon = React.useMemo(
    () =>
      timelineToEvents(upcoming.data, now)
        .filter((e) => !e.done && !dueIds.has(e.id))
        .filter((e) => e.at.getTime() > now.getTime() && e.at.getTime() <= now.getTime() + DAY_MS)
        .slice(0, 10),
    [upcoming.data, now, dueItems],
  );

  const open = (item: OrbitListItem) => {
    select(
      item.source === 'task' && item.task
        ? { type: 'task', id: item.task.id }
        : item.application
          ? { type: 'application', event: item.application }
          : null,
    );
    router.push(ROUTES.orbit);
    onClose();
  };

  const toggleAlerts = async () => {
    setAlerts(alerts === 'on' ? disableDesktopAlerts() : await enableDesktopAlerts());
  };

  const caughtUp = !isLoading && dueItems.length === 0 && soon.length === 0;

  return (
    <div className="fixed inset-0 z-[65] flex justify-end">
      <div className="fixed inset-0 bg-bg-inverse/40" onClick={onClose} aria-hidden="true" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Notifications"
        className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-border-default bg-bg-surface shadow-lg"
      >
        <div className="flex items-center justify-between border-b border-border-accent bg-bg-accent-subtle px-5 py-3">
          <div className="flex items-center gap-2">
            <BellRing className="h-5 w-5 text-text-accent" aria-hidden="true" />
            <h2 className="text-base font-bold text-text-primary">Notifications</h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 space-y-5 overflow-y-auto p-4">
          {isLoading && (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          )}
          {isError && (
            <p role="alert" className="text-sm text-text-danger">
              Could not load your notifications.
            </p>
          )}

          {caughtUp && (
            <div className="py-10 text-center">
              <Check className="mx-auto h-8 w-8 text-text-success" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-text-primary">You are all caught up</p>
              <p className="text-xs text-text-secondary">
                Nothing is due and nothing is coming in the next 24 hours.
              </p>
            </div>
          )}

          {dueItems.length > 0 && (
            <section aria-label="Needs you now">
              <h3 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-danger">
                Needs you now · {dueItems.length}
                {due && due.overdueCount > dueItems.length
                  ? ` (${due.overdueCount} overdue in all)`
                  : ''}
              </h3>
              <ul>
                {dueItems.map((item) => (
                  <EventRow
                    key={item.id}
                    event={item}
                    now={now}
                    onOpen={open}
                    onToggleDone={(i) =>
                      i.task && complete.mutate({ id: i.task.id, version: i.task.version })
                    }
                    trailing={
                      item.task && (
                        <SnoozeMenu
                          now={now}
                          onSnooze={(until) =>
                            snooze.mutate({ id: item.task!.id, until, version: item.task!.version })
                          }
                        />
                      )
                    }
                  />
                ))}
              </ul>
            </section>
          )}

          {soon.length > 0 && (
            <section aria-label="Coming up">
              <h3 className="px-1 pb-1 text-[11px] font-bold uppercase tracking-wide text-text-tertiary">
                Next 24 hours · {soon.length}
              </h3>
              <ul>
                {soon.map((event) => (
                  <EventRow key={event.id} event={event} now={now} onOpen={open} />
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="space-y-2 border-t border-border-default px-5 py-3 text-xs">
          {alerts !== 'unsupported' && (
            <div className="flex items-center justify-between gap-2">
              <span className="text-text-secondary">
                Desktop alerts
                {alerts === 'blocked' && ' are blocked in your browser settings'}
                {alerts === 'on' && ' are on while Orbit is open'}
              </span>
              {alerts !== 'blocked' && (
                <Button size="sm" variant="secondary" onClick={() => void toggleAlerts()}>
                  {alerts === 'on' ? 'Turn off' : 'Turn on'}
                </Button>
              )}
            </div>
          )}
          <Button
            size="sm"
            className="w-full"
            onClick={() => {
              router.push(ROUTES.orbit);
              onClose();
            }}
          >
            Open Orbit
          </Button>
        </div>
      </aside>
    </div>
  );
};
