import React from 'react';
import { Bell, Plus } from 'lucide-react';
import { useSnoozeOrbitTask } from '../../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitPlan, useOrbitTasksInfinite } from '../../../../api/hooks/queries/useOrbitQueries';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import { taskToListItem } from '../../../../utils/helpers/orbit/orbit-events';
import { Spinner } from '../../../atoms/Spinner';
import { EventRow } from '../EventRow';
import { SnoozeMenu } from '../SnoozeMenu';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** Reminders and company checks that are still open, soonest first, with a quick snooze. */
export const RemindersWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const q = useOrbitUiStore((s) => s.filters.q.trim());
  const { open, toggleDone, openNew } = useOrbitActions();
  const snooze = useSnoozeOrbitTask();
  const { data: plan } = useOrbitPlan();
  const query = useOrbitTasksInfinite({
    kind: ['REMINDER', 'WATCH'],
    status: 'OPEN',
    q: q || undefined,
    sort: 'due',
  });
  const items = (query.data?.pages.flatMap((p) => p.items) ?? []).map((t) =>
    taskToListItem(t, now),
  );

  return (
    <WidgetFrame
      title="Reminders"
      icon={Bell}
      {...frame}
      actions={
        <>
          {plan && plan.plan === 'FREE' && (
            <span className="text-[11px] text-text-secondary">
              {plan.openReminders}/{plan.limits.reminders} used
            </span>
          )}
          <button
            type="button"
            onClick={() => openNew({ kind: 'REMINDER' })}
            className="flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
          >
            <Plus className="h-3 w-3" aria-hidden="true" /> New
          </button>
        </>
      }
    >
      {query.isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : items.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-text-primary">No reminders</p>
          <p className="text-xs text-text-secondary">
            Try: remind me to check Altrium careers in 2 weeks.
          </p>
        </div>
      ) : (
        <ul>
          {items.map((item) => (
            <EventRow
              key={item.id}
              event={item}
              now={now}
              onOpen={open}
              onToggleDone={toggleDone}
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
      )}
    </WidgetFrame>
  );
};
