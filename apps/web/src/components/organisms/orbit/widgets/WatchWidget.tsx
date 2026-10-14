import React from 'react';
import { Check, ExternalLink, Eye, Plus } from 'lucide-react';
import { useCompleteOrbitTask } from '../../../../api/hooks/mutations/useOrbitTaskMutations';
import { useOrbitTasksInfinite } from '../../../../api/hooks/queries/useOrbitQueries';
import { useNow } from '../../../../hooks/useNow';
import { useOrbitUiStore } from '../../../../store/orbit-ui.store';
import { formatWhen } from '../../../../utils/helpers/orbit/orbit-dates';
import { Spinner } from '../../../atoms/Spinner';
import { useOrbitActions } from '../useOrbitActions';
import { WidgetFrame } from '../WidgetFrame';
import { type WidgetProps } from './widget-types';

/** Companies you keep checking. "Checked" completes the round and schedules the next one. */
export const WatchWidget: React.FC<WidgetProps> = ({ frame }) => {
  const now = useNow();
  const { openNew } = useOrbitActions();
  const select = useOrbitUiStore((state) => state.select);
  const complete = useCompleteOrbitTask();
  const { data, isLoading } = useOrbitTasksInfinite({
    kind: ['WATCH'],
    status: 'OPEN',
    sort: 'due',
  });
  const rows = data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <WidgetFrame
      title="Company watch"
      icon={Eye}
      {...frame}
      actions={
        <button
          type="button"
          onClick={() => openNew({ kind: 'WATCH' })}
          className="flex items-center gap-1 rounded-md border border-border-default px-2 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
        >
          <Plus className="h-3 w-3" aria-hidden="true" /> Watch
        </button>
      }
    >
      {isLoading ? (
        <div className="flex justify-center py-6">
          <Spinner size="sm" />
        </div>
      ) : rows.length === 0 ? (
        <div className="py-4 text-center">
          <p className="text-sm font-medium text-text-primary">Nobody on watch</p>
          <p className="text-xs text-text-secondary">
            Keep an eye on a careers page every few weeks.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {rows.map((task) => (
            <li
              key={task.id}
              className="flex items-center gap-2 rounded-lg px-1.5 py-1.5 hover:bg-bg-muted"
            >
              <button
                type="button"
                onClick={() => select({ type: 'task', id: task.id })}
                className="min-w-0 flex-1 text-left"
              >
                <span className="block truncate text-sm font-medium text-text-primary">
                  {task.companyName ?? task.title}
                </span>
                <span className="block truncate text-[11px] text-text-secondary">
                  next check{' '}
                  {formatWhen(task.dueAt ? new Date(task.dueAt) : null, task.allDay, now)}
                  {task.recurrence ? ` · repeats ${task.recurrence.freq.toLowerCase()}` : ''}
                </span>
              </button>
              {task.watchUrl && (
                <a
                  href={task.watchUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  aria-label={`Open ${task.companyName ?? task.title} page`}
                  className="rounded-md p-1 text-text-accent hover:bg-bg-muted"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
              <button
                type="button"
                onClick={() => complete.mutate({ id: task.id, version: task.version })}
                aria-label={`Mark ${task.companyName ?? task.title} as checked`}
                className="flex items-center gap-1 rounded-md border border-border-default px-1.5 py-0.5 text-[11px] font-medium text-text-secondary hover:bg-bg-muted"
              >
                <Check className="h-3 w-3" aria-hidden="true" /> Checked
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetFrame>
  );
};
